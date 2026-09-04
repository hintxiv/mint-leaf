import { Job } from '@/data/jobs'
import { Locale } from '@/context/LanguageContext'

export const getJobName = (job: Job, locale: Locale): string => {
    if (locale === 'ja' && job.nameJa) {
        return job.nameJa
    }
    return job.name
}
