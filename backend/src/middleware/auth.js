import { createUserSupabaseClient } from '../config/supabase.js'
import { AppError } from '../utils/errors.js'

export async function requireAuth(req, _res, next) {
  try {
    const authorization = req.get('authorization') || ''
    const [scheme, accessToken] = authorization.split(/\s+/)

    if (scheme?.toLowerCase() !== 'bearer' || !accessToken) {
      throw new AppError('Authentication is required.', 401)
    }

    const supabase = createUserSupabaseClient(accessToken)
    const { data, error } = await supabase.auth.getUser(accessToken)

    if (error || !data?.user) {
      throw new AppError('The authentication session is invalid or expired.', 401)
    }

    req.auth = { userId: data.user.id, accessToken }
    req.supabase = supabase
    next()
  } catch (error) {
    if (error instanceof AppError) return next(error)
    return next(new AppError('Authentication could not be verified.', 401))
  }
}
