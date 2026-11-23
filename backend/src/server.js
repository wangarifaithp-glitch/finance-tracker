import { createApp } from './app.js'
import { env } from './config/env.js'

const app = createApp()

app.listen(env.port, () => {
  console.log(`Finance Tracker backend listening on port ${env.port}`)
})
