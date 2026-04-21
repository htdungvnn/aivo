#!/bin/bash

while true; do
  # Quét tất cả các ô (pane) trong tmux
  panes=$(tmux list-panes -a -F '#{session_name}:#{window_index}.#{pane_index}')

  for pane in $panes; do
    # Chụp 5 dòng cuối của mỗi màn hình
    content=$(tmux capture-pane -pt "$pane" -S -5)

    # Nếu thấy chữ 'retry' thì gõ 'continue'
    if echo "$content" | grep -qi "retry"; then
      echo "Phát hiện lỗi tại $pane, đang gửi 'continue'..."
      tmux send-keys -t "$pane" "continue" Enter
    fi
  done

  sleep 3
done
