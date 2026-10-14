import { connection } from 'next/server'
import Landing from './components/Landing'
import ComingSoon from './components/ComingSoon'
import { isLaunched } from './launch'

export default async function Home() {
  await connection() // se decide en cada visita (antes o después de la apertura)
  return isLaunched() ? <Landing /> : <ComingSoon />
}
