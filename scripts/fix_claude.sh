#!/bin/bash

declare -A last_line_content
declare -A last_change_time
declare -A last_fixed_error  # New: Tracks the last error string we already handled

while true; do
  panes=$(tmux list-panes -a -F '#{session_name}:#{window_index}.#{pane_index}')

  for pane in $panes; do
    current_time=$(date +%s)

    # 1. Capture recent context
    # We check the last 5 lines to find the error
    recent_output=$(tmux capture-pane -pt "$pane" -S -5)
    current_line=$(echo "$recent_output" | tail -n 1)

    # Update activity timer if content changed
    if [ "${last_line_content[$pane]}" != "$current_line" ]; then
      last_line_content[$pane]=$current_line
      last_change_time[$pane]=$current_time
    fi

    # 2. FIXED CONDITION: Error detection with "Memory"
    # Search for the error line
    error_line=$(echo "$recent_output" | grep -i "request_id")

    if [ -n "$error_line" ]; then
      # Only send 'continue' if this is a NEW error line we haven't fixed yet
      if [ "${last_fixed_error[$pane]}" != "$error_line" ]; then
        echo "New error detected at $pane, sending 'continue'..."
        tmux send-keys -t "$pane" "continue" Enter

        # Mark this specific error as "Handled"
        last_fixed_error[$pane]=$error_line
        last_change_time[$pane]=$current_time
        sleep 2
      fi
    fi

    # 3. Timeout Logic (Stays the same but uses updated timers)
    if [ -z "${last_change_time[$pane]}" ]; then last_change_time[$pane]=$current_time; fi
    idle_time=$((current_time - last_change_time[$pane]))

    if [ $idle_time -ge 300 ]; then
      echo "Pane $pane idle for 5m, sending '1'..."
      tmux send-keys -t "$pane" "1" Enter
      last_change_time[$pane]=$current_time
    fi
  done

  sleep 15
done
