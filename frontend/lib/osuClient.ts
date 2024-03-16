import {v2, auth} from "osu-api-extended"

await auth.login(parseInt(process.env.OSU_CLIENT_ID, 10), process.env.OSU_CLIENT_SECRET, ['public'])

export default v2