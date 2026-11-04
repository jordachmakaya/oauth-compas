# Records the README demo with https://github.com/charmbracelet/vhs
# The binary comes from the packed tarball; all values are placeholders.
Output demo.gif
Output demo.mp4

Set Shell "bash"
Set FontSize 16
Set Width 1100
Set Height 760
Set Padding 16
Set Theme "Catppuccin Mocha"
Set TypingSpeed 45ms

Hide
Type "export PS1='$ ' && mkdir -p /tmp/my-app && cd /tmp/my-app"
Enter
Type `printf '{"client_id":"PLACEHOLDER_ID","client_secret":"PLACEHOLDER_SECRET","redirect_uris":["http://localhost:3000/api/auth/callback/github"]}' > ~/github-oauth.json`
Enter
Type "clear"
Enter
Show

Sleep 700ms
Type "oauth-compass"
Sleep 400ms
Enter
Sleep 2s
Type "2"
Sleep 500ms
Enter
Sleep 1200ms
Enter
Sleep 1200ms
Enter
Sleep 6s
Type "~/github-oauth.json"
Sleep 800ms
Enter
Sleep 6s
