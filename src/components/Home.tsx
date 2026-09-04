"use client"

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Canvas, CanvasRenderState } from './Canvas/Canvas'
import styled from 'styled-components'
import { Action, Status } from './Canvas/types'
import { rotationToText, textToRotation } from '../lib/parseRotation'
import { Job, jobs } from '../data/jobs'
import { Header } from './Header/Header'
import { Abilities } from './Abilities/Abilities'
import { Title } from './Title/Title'
import { Footer } from './Footer/Footer'
import { useTranslation } from '@/context/LanguageContext'
import { getJobName } from '@/lib/jobs'

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100vh;
`

interface HomeProps {
    discordAuth: JSX.Element
}

export const Home = ({ discordAuth }: HomeProps) => {
    const { locale, localeReady, t } = useTranslation()
    const [rotation, setRotation] = useState<Action[]>([])
    const [rotationText, setRotationText] = useState('')
    const [rotationInputError, setRotationInputError] = useState<boolean>(false)
    const [prepullRotation, setPrepullRotation] = useState<Action[]>([])
    const [screenWidth, setScreenWidth] = useState(0)
    const [job, setJob] = useState<Job>(jobs['DRK'])
    const [rotationTitle, setRotationTitle] = useState('')
    const [expansion, setExpansion] = useState('')
    const [patch, setPatch] = useState<string>('7.4')
    const [level, setLevel] = useState<number>(100)
    const [useBalanceLogo, setUseBalanceLogo] = useState<boolean>(false)
    const [renderReady, setRenderReady] = useState(false)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const onRenderStateChange = useCallback((state: CanvasRenderState) => {
        setRenderReady(state.status === 'ready')
    }, [])

    useLayoutEffect(() => {
        const onResize = () => {
            setScreenWidth(window.innerWidth)
        }
        onResize()
        window.addEventListener("resize", onResize)
        return () => {
            window.removeEventListener("resize", onResize)
        }
    }, [])

    // Apply translated defaults once, after locale is restored from localStorage.
    useEffect(() => {
        if (!localeReady) {
            return
        }
        setRotationTitle(t('defaults.rotationTitle'))
        setExpansion(t('defaults.expansion'))
    }, [localeReady]) // eslint-disable-line react-hooks/exhaustive-deps -- run once when locale is ready

    const addAction = async (action: Action, status?: Status) => {
        if (status) {
            action.statusApplied = status
        }

        if (action.prepull) {
            const sortedPrepullRotation = [...prepullRotation, action].sort((a, b) =>
                (a.prepull ?? 0) - (b.prepull ?? 0)
            )
            setPrepullRotation(sortedPrepullRotation)
            setRotationText(rotationToText([...sortedPrepullRotation, ...rotation]))
            return
        }

        setRotation([...rotation, action])
        setRotationText(rotationToText([...prepullRotation, ...rotation, action]))
    }

    const parseRotation = async (text: string) => {
        setRotationText(text)

        if (text.trim() === "") {
            setRotation([])
            setPrepullRotation([])
            setRotationInputError(false)
            return
        }

        try {
            const parsedRotation = await textToRotation(text.trim(), locale)

            if (!parsedRotation) {
                setRotationInputError(true)
                return
            }

            setRotation(parsedRotation.filter(action => !action.prepull))
            setPrepullRotation(parsedRotation.filter(action => action.prepull).sort((a, b) =>
                (a.prepull ?? 0) - (b.prepull ?? 0)
            ))
            setRotationInputError(false)
        } catch (e) {
            setRotationInputError(true)
        }
    }

    const exportInfographic = () => {
        const canvas = canvasRef.current
        if (!canvas || !renderReady) return

        const link = document.createElement('a')
        link.download = `${getJobName(job, locale)} ${rotationTitle}.png`
        link.href = canvas.toDataURL('image/png')
        link.click()
    }

    return (
        <Container>
            <Title discordAuth={discordAuth} />
            <Header
                currentJob={job}
                setJob={setJob}
                title={rotationTitle}
                setTitle={setRotationTitle}
                expansion={expansion}
                setExpansion={setExpansion}
                patch={patch}
                setPatch={setPatch}
                level={level}
                setLevel={setLevel}
            />
            <Abilities
                createAction={addAction}
                rotationText={rotationText}
                parseRotation={parseRotation}
                rotationInputError={rotationInputError}
                job={job}
            />
            <Canvas
                screenWidth={screenWidth}
                prepullRotation={prepullRotation}
                rotation={rotation}
                jobName={getJobName(job, locale)}
                jobIcon={job?.icon}
                title={rotationTitle}
                expansion={expansion}
                patch={patch}
                level={level}
                ref={canvasRef}
                useBalanceLogo={useBalanceLogo}
                onRenderStateChange={onRenderStateChange}
            />
            <Footer
                onExport={exportInfographic}
                exportReady={renderReady}
                useBalanceLogo={useBalanceLogo}
                setUseBalanceLogo={setUseBalanceLogo}
            />
        </Container>
    )
}
