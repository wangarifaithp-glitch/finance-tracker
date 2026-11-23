import {
  listConnections,
  listSyncEvents,
  listConnectedAccounts,
  disconnectConnection,
  getProviderAvailability,
  getConnection,
  createSyncRun,
  failSyncRun,
  listSyncRuns,
  providerCatalog,
} from '../services/connectionService.js'
import { getProviderAdapter } from '../services/transactionSyncService.js'
import { AppError } from '../utils/errors.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const connectionController = {
  providers: asyncHandler(async (_req, res) => {
    res.json({ data: providerCatalog })
  }),

  list: asyncHandler(async (req, res) => {
    const data = await listConnections(req.supabase, req.auth.userId)
    res.json({ data })
  }),

  syncHistory: asyncHandler(async (req, res) => {
    const data = await listSyncEvents(req.supabase, req.auth.userId)
    res.json({ data })
  }),

  syncRuns: asyncHandler(async (req, res) => {
    const data = await listSyncRuns(
      req.supabase,
      req.auth.userId,
      req.validated.params.id,
    )
    res.json({ data })
  }),

  accounts: asyncHandler(async (req, res) => {
    const data = await listConnectedAccounts(
      req.supabase,
      req.auth.userId,
      req.validated.params.id,
    )
    res.json({ data })
  }),

  connect: asyncHandler(async (req, _res, next) => {
    const provider = getProviderAvailability(req.validated.params.provider)
    if (!provider) {
      return next(new AppError(
        'This provider requires verified provider access before a connection can be created.',
        501,
        'PROVIDER_NOT_CONFIGURED',
      ))
    }
    return next(new AppError(
      'This provider adapter is registered but its authorization flow is not implemented.',
      501,
      'ADAPTER_AUTH_FLOW_NOT_IMPLEMENTED',
    ))
  }),

  disconnect: asyncHandler(async (req, res) => {
    const data = await disconnectConnection(
      req.supabase,
      req.auth.userId,
      req.validated.params.id,
    )
    res.json({ data })
  }),

  sync: asyncHandler(async (req, _res, next) => {
    const connection = await getConnection(
      req.supabase,
      req.auth.userId,
      req.validated.params.id,
    )
    const adapter = getProviderAdapter(connection.provider)
    const run = await createSyncRun(
      req.supabase,
      req.auth.userId,
      connection.id,
      'manual',
    )
    if (!getProviderAvailability(connection.provider) || !adapter) {
      await failSyncRun(
        req.supabase,
        run.id,
        req.auth.userId,
        'PROVIDER_NOT_CONFIGURED',
        'A verified provider adapter and credentials are required.',
      )
      return next(new AppError(
        'A live provider adapter is not configured for this connection.',
        501,
        'PROVIDER_NOT_CONFIGURED',
      ))
    }
    await failSyncRun(
      req.supabase,
      run.id,
      req.auth.userId,
      'ADAPTER_SYNC_NOT_IMPLEMENTED',
      'The provider adapter has not implemented synchronization.',
    )
    return next(new AppError(
      'This provider adapter is registered but synchronization is not implemented.',
      501,
      'ADAPTER_SYNC_NOT_IMPLEMENTED',
    ))
  }),
}
