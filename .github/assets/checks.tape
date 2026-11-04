# Records the README safety demo with https://github.com/charmbracelet/vhs
# The binary comes from the packed tarball; all values are placeholders.
Output checks.gif
Output checks.mp4

Set Shell "bash"
Set FontSize 16
Set Width 1100
Set Height 420
Set Padding 16
Set Theme "Catppuccin Mocha"
Set TypingSpeed 35ms

Hide
Type "export PS1='$ ' && mkdir -p /tmp/my-app && cd /tmp/my-app"
Enter
Type `printf '{"client_id":"PLACEHOLDER_ID","client_secret":"PLACEHOLDER_SECRET","redirect_uris":["http://localhost:3000/cb"]}' > ~/app.json`
Enter
Type "oauth-compass import github --file ~/app.json > /dev/null && clear"
Enter
Sleep 1s
Show

Sleep 600ms
Type "oauth-compass doctor github"
Enter
Sleep 2500ms
Type "oauth-compass import github --file ~/app.json --oot /tmp/backup"
Enter
Sleep 2500ms
Type "oauth-compass import github --file ~/app.json"
Enter
Sleep 3500ms
