import { NextApiResponse, NextApiRequest } from 'next'
import { passport } from '@lib/osuPassport'
import { COOKIES } from '@constants/constants'

const handler = async (_req: NextApiRequest, _res: NextApiResponse) => {
  const { provider } = _req.query
  if (provider !== "osu") {
    return _res.status(404).send('Provider not allowed');
  }

  if(_req.cookies[COOKIES.userSession]){
    return _res.redirect('/dashboard')
  }

  passport.authenticate(provider)(_req, _res, (..._args) => {
    return true
  })
}

export default handler
