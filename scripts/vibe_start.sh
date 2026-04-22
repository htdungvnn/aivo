#!/bin/bash

# Đường dẫn dự án AIVO
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJ_DIR="$(dirname "$SCRIPT_DIR")"
SESSION="aivo_vibe_1"

# Tắt session cũ nếu đang chạy để khởi động lại sạch sẽ
tmux kill-session -t $SESSION 2>/dev/null

# 1. Khởi tạo session
tmux new-session -d -s $SESSION -n "ParallelVibe" -c "$PROJ_DIR"

# 2. Chạy "vệ sĩ" fix_claude.sh chạy ngầm
chmod +x "$SCRIPT_DIR/fix_claude.sh"
tmux send-keys -t $SESSION "$SCRIPT_DIR/fix_claude.sh &" Enter
tmux clear-history

# 3. Chia thành 4 ô (Tạo ra 4 pane trước)
tmux split-window -v -c "$PROJ_DIR"
tmux split-window -h -c "$PROJ_DIR"
tmux split-window -v -t 0 -c "$PROJ_DIR"

# --- LỆNH QUAN TRỌNG: ÉP CHIA ĐỀU 2x2 ---
tmux select-layout -t $SESSION tiled

# 4. Chạy Claude CLI trên cả 4 ô đã chia đều
for pane in {0..3}; do
  tmux send-keys -t $SESSION:0.$pane "claude --permission-mode bypassPermissions" Enter
done

# Nhảy vào session
tmux attach-session -t $SESSION


# ./scripts/vibe_start.sh
