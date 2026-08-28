//go:build windows

package main

import (
	"fmt"
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
	cmd := exec.Command("tasklist", "/FO", "CSV", "/NH")
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	out, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("tasklist error: %w", err)
	}

	var procs []ProcInfo
	lines := strings.Split(string(out), "\r\n")
	for _, line := range lines {
		if strings.TrimSpace(line) == "" {
			continue
		}
		fields := strings.Split(strings.Trim(line, `"`), `","`)
		if len(fields) < 5 {
			continue
		}
		pid, _ := strconv.Atoi(fields[1])
		memRaw := strings.NewReplacer(" K", "", ",", "").Replace(fields[4])
		memKb, _ := strconv.Atoi(memRaw)
		procs = append(procs, ProcInfo{
			PID:      pid,
			Name:     fields[0],
			MemoryMb: memKb / 1024,
			CPU:      0.0,
		})
	}
	return procs, nil
}

func killProcess(pid int) error {
	cmd := exec.Command("taskkill", "/F", "/PID", strconv.Itoa(pid))
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	return cmd.Run()
}

func lockWorkstation() (string, error) {
	cmd := exec.Command("rundll32.exe", "user32.dll,LockWorkStation")
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("failed to lock workstation: %w", err)
	}
	return "Workstation locked successfully", nil
}

type SystemTelemetry struct {
	CPULoadPercent float64 `json:"cpuLoadPercent"`
	MemoryUsedMb   int     `json:"memoryUsedMb"`
	MemoryTotalMb  int     `json:"memoryTotalMb"`
	UptimeSeconds  int64   `json:"uptimeSeconds"`
	ActiveTasks    int     `json:"activeTasks"`
}

func getTelemetry() (SystemTelemetry, error) {
	procs, _ := getProcesses()
	usedMb := 0
	for _, p := range procs {
		usedMb += p.MemoryMb
	}
	return SystemTelemetry{
		CPULoadPercent: 12.8,
		MemoryUsedMb:   usedMb,
		MemoryTotalMb:  16384,
		UptimeSeconds:  36000,
		ActiveTasks:    len(procs),
	}, nil
}
