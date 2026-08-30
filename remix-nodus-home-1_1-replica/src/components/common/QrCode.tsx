import React from 'react';

interface QrCodeProps {
  value: string;
  size?: number;
  fgColor?: string;
  bgColor?: string;
  className?: string;
}

export const QrCode: React.FC<QrCodeProps> = ({
  value,
  size = 200,
  fgColor = '#34C759',
  bgColor = '#121214',
  className = '',
}) => {
  const getMatrix = (str: string) => {
    const N = 21;
    const matrix: boolean[][] = Array.from({ length: N }, () => Array(N).fill(false));

    const drawFinder = (row: number, col: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
            matrix[row + r][col + c] = true;
          }
        }
      }
    };

    drawFinder(0, 0);
    drawFinder(0, N - 7);
    drawFinder(N - 7, 0);

    for (let i = 8; i < N - 8; i += 2) {
      matrix[6][i] = true;
      matrix[i][6] = true;
    }

    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }

    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (
          (r < 8 && c < 8) ||
          (r < 8 && c >= N - 8) ||
          (r >= N - 8 && c < 8) ||
          (r === 6 || c === 6)
        ) {
          continue;
        }

        const seed = (r * N + c + Math.abs(hash)) % 100;
        const charCode = str.charCodeAt((r + c) % str.length) || 42;
        matrix[r][c] = (seed + charCode) % 3 === 0 || (r * c) % 5 === 0;
      }
    }

    return matrix;
  };

  const matrix = getMatrix(value);
  const N = matrix.length;
  const cellSize = size / N;

  return (
    <div
      className={`inline-flex flex-col items-center justify-center p-3 rounded-2xl border border-white/10 shadow-2xl relative select-none ${className}`}
      style={{ backgroundColor: bgColor }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <rect width={size} height={size} fill={bgColor} rx={8} />
        {matrix.map((row, r) =>
          row.map((cell, c) => {
            if (!cell) return null;
            return (
              <rect
                key={`${r}-${c}`}
                x={c * cellSize}
                y={r * cellSize}
                width={cellSize - 0.4}
                height={cellSize - 0.4}
                fill={fgColor}
                rx={1.5}
              />
            );
          })
        )}
      </svg>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-9 h-9 rounded-xl bg-[#1C1C1E] border border-[#34C759]/40 flex items-center justify-center text-[#34C759] shadow-lg">
          <span className="font-bold text-xs font-mono">⚡</span>
        </div>
      </div>
    </div>
  );
};
