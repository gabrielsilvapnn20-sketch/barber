import { useState } from 'react'

/**
 * Logo da lanchonete.
 * Usa /logo.png se você colocar o arquivo em `public/logo.png`
 * (é só arrastar a imagem original pra lá — pelo site do GitHub ou no projeto).
 * Se não existir, cai automaticamente na versão em vetor `public/logo.svg`.
 */
export default function Logo({ className = '', alt = 'Lanchonete Rodrigues' }) {
  const [src, setSrc] = useState('/logo.png')
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => {
        if (src !== '/logo.svg') setSrc('/logo.svg')
      }}
    />
  )
}
