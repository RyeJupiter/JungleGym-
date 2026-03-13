function Error({ statusCode }: { statusCode?: number }) {
  return <p>{statusCode ? `${statusCode} error` : 'An error occurred'}</p>
}

Error.getInitialProps = ({ res, err }: { res?: { statusCode: number }; err?: { statusCode: number } }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404
  return { statusCode }
}

export default Error
