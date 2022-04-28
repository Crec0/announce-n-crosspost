# announce-n-crosspost

Simple action which sends a message over to discord news channel and crossposts it. 

## Inputs

| Input name | Description                                                                                                               | Required | Default Value |
|------------|---------------------------------------------------------------------------------------------------------------------------|----------|---------------|
| bot-token  | Discord bot token. This bot should have the `SEND_MESSAGES` permission in the news channel you want to send message in.   | `true`   | `N/A`         |
| channel    | A string being the channel id of the news channel you want to post the message in. Channel **MUST** be a news channel.    | `true`   | `N/A`         |
| content    | The message content which should be sent.                                                                                 | `true`   | `N/A`         |

# Outputs

| Output name | Description                             |
|-------------|-----------------------------------------|
| message-id  | Id of the messages sent in news channel |

## Example Job

```yaml
  Publish-To-Discord:
    runs-on: ubuntu-latest
    steps:
      - name: Publish
        id: publish-to-discord
        uses: Crec0/announce-n-crosspost@v1
        with:
          bot-token: ${{ secrets.DISCORD_BOT_TOKEN }}
          channel: ${{ secrets.CHANNEL_ID }}
          content: |
            **${{ github.event.release.name }}** has been released!
            
            ${{ github.event.release.body }}
            
            Get it on Github Releases: <${{ github.event.release.html_url }}>

      - name: Print message id
        run: echo "Message id = ${{ steps.publish-to-discord.outputs.message-id }}"
```
