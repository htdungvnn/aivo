#!/bin/bash

# fix_claude.sh - Automatically sends "continue" when Claude asks for retry
# Usage: ./scripts/fix_claude.sh [claude arguments...]
# Example: ./scripts/fix_claude.sh /prompt "Hello"

set -e

# Build the claude command with all arguments
CLAUDE_CMD="claude $*"

# Use expect to interact with Claude CLI
# When we see "Please retry.", automatically send "continue"
expect << EOF
    log_user 1
    spawn {*}[lindex $CLAUDE_CMD 0] {*}[lrange $CLAUDE_CMD 1 end]

    # Set a reasonable timeout
    set timeout -1

    # Loop to handle multiple retry requests
    while {1} {
        expect {
            -re "Please retry\\." {
                # Send "continue" when we see "Please retry."
                send "continue\r"
                exp_continue
            }
            eof {
                break
            }
            timeout {
                break
            }
            default {
                # Pass through all other output
                exp_continue
            }
        }
    }

    wait
EOF
