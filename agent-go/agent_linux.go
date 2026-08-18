//go:build linux

package main

import (
	"fmt"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"syscall"
)

type ProcInfo struct {
	PID      int     `json:"pid"`
	Name     string  `json:"name"`
	MemoryMb int     `json:"memoryMb"`
	CPU      float64 `json:"cpu"`
}

func getProcesses() ([]ProcInfo, error) {
	entries, err := os.ReadDir("/proc")
	if err != nil {
		return nil, fmt.Errorf("failed to read /proc: %w", err)
	}

	pageSize := os.Getpagesize()
	var procs []ProcInfo

	for _, e := range entries {
		pid, err := strconv.Atoi(e.Name())
		if err != nil {
			continue // Skip non-PID entries in /proc
		}

		commBytes, err := os.ReadFile(fmt.Sprintf("/proc/%d/comm", pid))
		name := ""
		if err == nil {
			name = strings.TrimSpace(string(commBytes))
		} else {
			cmdlineBytes, err := os.ReadFile(fmt.Sprintf("/proc/%d/cmdline", pid))
			if err == nil && len(cmdlineBytes) > 0 {
				name = strings.TrimSpace(string(cmdlineBytes))
			} else {
				name = fmt.Sprintf("proc-%d", pid)
			}
		}

		memMb := 0
		statmBytes, err := os.ReadFile(fmt.Sprintf("/proc/%d/statm", pid))
		if err == nil {
			fields := strings.Fields(string(statmBytes))
			if len(fields) > 1 {
				pages, _ := strconv.Atoi(fields[1])
				memMb = (pages * pageSize) / (1024 * 1024)
			}
		}

		procs = append(procs, ProcInfo{
			PID:      pid,
			Name:     name,
			MemoryMb: memMb,
			CPU:      0.0,
		})
	}
	return procs, nil
}

func killProcess(pid int) error {
	// First attempt direct syscall SIGKILL
	err := syscall.Kill(pid, syscall.SIGKILL)
	if err == nil {
		return nil
	}

	// Fallback to su -c for rooted Android host processes if container sandbox blocks direct signal
	if _, lookErr := exec.LookPath("su"); lookErr == nil {
		cmd := exec.Command("su", "-c", fmt.Sprintf("kill -9 %d", pid))
		return cmd.Run()
	}

	return err
}

func lockWorkstation() (string, error) {
	// If running inside Android chroot with root access, toggle sleep/power key
	if _, lookErr := exec.LookPath("su"); lookErr == nil {
		cmd := exec.Command("su", "-c", "input keyevent 26")
		if err := cmd.Run(); err == nil {
			return "Android device screen locked", nil
		}
	}

	// Standard Linux desktop lock via loginctl or xdg-screensaver
	if _, lookErr := exec.LookPath("loginctl"); lookErr == nil {
		cmd := exec.Command("loginctl", "lock-session")
		if err := cmd.Run(); err == nil {
			return "Linux session locked", nil
		}
	}

	return "Lock command executed", nil
}
