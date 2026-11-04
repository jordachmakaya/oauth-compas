# Records the README agent skill demo with https://github.com/charmbracelet/vhs
# The binary comes from the packed tarball.
Output agent-skill.gif
Output agent-skill.mp4

Set Shell "bash"
Set FontSize 16
Set Width 1100
Set Height 320
Set Padding 16
Set Theme "Catppuccin Mocha"
Set TypingSpeed 40ms

Hide
Type "export PS1='$ ' && mkdir -p /tmp/my-app && cd /tmp/my-app && clear"
Enter
Show

Sleep 600ms
Type "oauth-compass skill install"
Enter
Sleep 2200ms
Type "grep -o 'Never [a-z ]*[a-z]**' .claude/skills/oauth-compass/SKILL.md | tr -d '*'"
Enter
Sleep 4500ms
