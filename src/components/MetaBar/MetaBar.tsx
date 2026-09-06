import { Job } from '@/data/jobs'
import styled from 'styled-components'
import { JobSelect } from '../Header/JobSelect'
import { Input as AntdInput } from 'antd'
import { useTranslation } from '@/context/LanguageContext'
import { LIBRARY_TAB_GUTTER_PX } from '@/components/Library/LibraryPanel'

const MetaBarContainer = styled.div`
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px 20px;
    background-color: #262833;
    color: white;
    width: 100%;
    border-bottom: 1px solid white;
    min-height: 56px;
    max-height: 72px;
    /* Pad left so the library tab does not cover the Job label. */
    padding: 8px 16px 8px ${16 + LIBRARY_TAB_GUTTER_PX}px;
    flex-shrink: 0;
`

const Field = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    white-space: nowrap;
`

const Input = styled(AntdInput)`
    font-size: 14px;
    width: 140px;
`

const TitleInput = styled(AntdInput)`
    font-size: 14px;
    width: 280px;
`

const NarrowInput = styled(AntdInput)`
    font-size: 14px;
    width: 72px;
`

interface MetaBarProps {
    currentJob?: Job
    setJob: (job: Job) => void
    title: string
    setTitle: (title: string) => void
    expansion: string
    setExpansion: (expansion: string) => void
    patch: string
    setPatch: (patch: string) => void
    level: number
    setLevel: (level: number) => void
}

export const MetaBar = ({
    currentJob,
    setJob,
    title,
    setTitle,
    expansion,
    setExpansion,
    patch,
    setPatch,
    level,
    setLevel,
}: MetaBarProps) => {
    const { t } = useTranslation()

    return (
        <MetaBarContainer>
            <Field>
                <span>{t('header.job')}</span>
                <JobSelect currentJob={currentJob} setJob={setJob} />
            </Field>
            <Field>
                <span>{t('header.rotationTitle')}</span>
                <TitleInput value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field>
                <span>{t('header.expansion')}</span>
                <Input value={expansion} onChange={(e) => setExpansion(e.target.value)} />
            </Field>
            <Field>
                <span>{t('header.patch')}</span>
                <NarrowInput value={patch} onChange={(e) => setPatch(e.target.value)} />
            </Field>
            <Field>
                <span>{t('header.level')}</span>
                <NarrowInput
                    type="number"
                    value={level}
                    onChange={(e) => setLevel(parseInt(e.target.value, 10) || 0)}
                />
            </Field>
        </MetaBarContainer>
    )
}
