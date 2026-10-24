import { useEffect, useState } from 'react'
import { cancelRender, continueRender, delayRender, staticFile } from 'remotion'

/** Loads Plus Jakarta Sans (bundled variable font, same file the app ships) before the first frame renders. */
export const useFont = () => {
  const [handle] = useState(() => delayRender('Plus Jakarta Sans'))
  useEffect(() => {
    const face = new FontFace('Plus Jakarta Sans', `url(${staticFile('fonts/pjs.woff2')}) format('woff2')`, { weight: '200 800' })
    face
      .load()
      .then((f) => {
        document.fonts.add(f)
        continueRender(handle)
      })
      .catch((e) => cancelRender(e))
  }, [handle])
}
