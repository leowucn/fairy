import superagent from 'superagent'

const API_URL = 'http://localhost:9528'
export function getRanks() {
  return superagent.get(`${API_URL}/api/getRanks`)
  .then((ranks) => {
    return ranks
  })
}
