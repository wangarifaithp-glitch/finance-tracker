export function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found.',
    },
  })
}

export function errorHandler(error, _req, res, _next) {
  const status = Number.isInteger(error.status) ? error.status : 500
  const code = error.code || (status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR')

  if (status >= 500) {
    console.error('Finance Tracker backend error:', error)
  }

  res.status(status).json({
    error: {
      code,
      message:
        status >= 500
          ? 'The request could not be completed.'
          : error.message || 'The request could not be completed.',
    },
  })
}
