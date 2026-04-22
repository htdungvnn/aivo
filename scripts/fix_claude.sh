#!/bin/bash

# Khởi tạo mảng lưu trữ
declare -A last_line_content
declare -A last_change_time

while true; do
  # Quét tất cả các ô (pane) trong tmux
  panes=$(tmux list-panes -a -F '#{session_name}:#{window_index}.#{pane_index}')

  for pane in $panes; do
    # 1. Lấy duy nhất 1 dòng cuối cùng của pane
    current_line=$(tmux capture-pane -pt "$pane" -S -1 | tail -n 1)
    current_time=$(date +%s)

    # Nếu dòng cuối có sự thay đổi so với lần trước
    if [ "${last_line_content[$pane]}" != "$current_line" ]; then
      last_line_content[$pane]=$current_line
      last_change_time[$pane]=$current_time
    fi

    # 2. KIỂM TRA ĐIỀU KIỆN 1: Tìm lỗi 'request_id' (kiểm tra trong 5 dòng cuối cho chắc)
    recent_5_lines=$(tmux capture-pane -pt "$pane" -S -5)
    if echo "$recent_5_lines" | grep -qi "request_id"; then
      echo "Phát hiện lỗi tại $pane, đang gửi 'continue'..."
      tmux send-keys -t "$pane" "continue" Enter
      # Cập nhật thời gian để không tính là bị treo
      last_change_time[$pane]=$(date +%s)
      sleep 1
    fi

    # 3. KIỂM TRA ĐIỀU KIỆN 2: Không có phản hồi trong 5 phút (300 giây)
    # Nếu chưa có dữ liệu thời gian bắt đầu, khởi tạo nó
    if [ -z "${last_change_time[$pane]}" ]; then last_change_time[$pane]=$current_time; fi

    idle_time=$((current_time - last_change_time[$pane]))

    if [ $idle_time -ge 300 ]; then
      echo "Pane $pane không đổi nội dung trong 5 phút, đang gửi '1'..."
      tmux send-keys -t "$pane" "1" Enter

      # Quan trọng: Cập nhật lại thời gian và nội dung sau khi gửi phím để tránh lặp lệnh
      last_change_time[$pane]=$(date +%s)
      last_line_content[$pane]=$(tmux capture-pane -pt "$pane" -S -1 | tail -n 1)
    fi
  done

  # Nghỉ 10-20 giây mỗi vòng lặp để giảm tải CPU
  sleep 15
done
