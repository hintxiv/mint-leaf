'use client'

import { useState, type ReactNode } from 'react'
import { useServerInsertedHTML } from 'next/navigation'
import { ServerStyleSheet, StyleSheetManager } from 'styled-components'

// Scope streamed server styles to each render; the compiler supplies stable component IDs.
export const StyleRegistry = ({ children }: { children: ReactNode }) => {
    const [sheet] = useState(() => new ServerStyleSheet())
    useServerInsertedHTML(() => {
        const styles = sheet.getStyleElement()
        sheet.instance.clearTag()
        return <>{styles}</>
    })
    return typeof window === 'undefined'
        ? <StyleSheetManager sheet={sheet.instance}>{children}</StyleSheetManager>
        : <>{children}</>
}
