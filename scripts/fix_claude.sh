#!/bin/bash

# fix_claude.sh - Automatically sends "continue" after 5 minutes when Claude asks for retry
# Usage: ./scripts/fix_claude.sh [claude arguments...]
# Example: ./scripts/fix_claude.sh /prompt "Hello"

set -e

# Build the claude command with all arguments
CLAUDE_CMD="claude $*"

# Use expect to interact with Claude CLI
# Wait 5 minutes (300 seconds) before sending "continue" to avoid rate limits
expect << EOF
    log_user 1
    spawn {*}[lindex $CLAUDE_CMD 0] {*}[lrange $CLAUDE_CMD 1 end]

    # Set a very long timeout (30 minutes) to handle the 5-minute wait
    set timeout 1800

    # Loop to handle multiple retry requests
    while {1} {
        expect {
            -re "Please retry\\." {
                # Wait 5 minutes (300 seconds) before sending "continue"
                sleep 300
                # Send "continue" after waiting
                send "continue\r"
                exp_continue
            }
            -re "Provider is temporarily unavailable" {
                # Wait 5 minutes for provider recovery
                sleep 300
                send "continue\r"
                exp_continue
            }
            -re "request_id=" {
                # Capture request ID and wait before continuing
                sleep 300
                send "continue\r"
                exp_continue
            }
            eof {
                break
            }
            timeout {
                # Check if we should break on extended timeout
                break
            }
            default {
                # Pass through all other output and continue waiting
                exp_continue
            }
        }
    }

    wait
EOF
