export const en = {
    meta: {
        title: 'Mint Leaf',
        description: 'FFXIV Rotation Builder',
    },
    title: {
        subtitle: 'FFXIV Rotation Builder',
        logoAlt: 'Logo',
        language: 'Language',
        balanceLink: 'The Balance FFXIV',
        balanceLogoAlt: 'The Balance Discord',
    },
    header: {
        sectionTitle: 'Header',
        job: 'Job',
        rotationTitle: 'Rotation Title',
        expansion: 'Expansion',
        patch: 'Patch',
        level: 'Level',
    },
    defaults: {
        rotationTitle: 'Title',
        expansion: 'Dawntrail',
    },
    abilities: {
        sectionTitle: 'Actions',
        actionBuilder: 'Action Builder',
        buffBuilder: 'Buff Builder',
        actionList: 'Action List',
        rotationPlaceholder: 'Paste your rotation here...',
        searchAction: 'Search for an action...',
        searchStatus: 'Search for a status...',
        orDivider: '- or -',
    },
    actionBuilder: {
        unknown: 'Unknown',
        item: '(Item)',
        custom: '(Custom)',
        actionType: 'Action Type',
        gcd: 'GCD',
        ogcd: 'oGCD',
        appliesBuff: 'Applies Buff?',
        prepull: 'Prepull?',
        timeSeconds: 'Time (s)',
        recastTime: 'Recast Time (s)',
        castTime: 'Cast Time (s)',
        weaveLate: 'Weave late?',
        addToRotation: 'Add to rotation',
        clear: 'Clear',
    },
    buffBuilder: {
        unknown: 'Unknown',
        custom: '(Custom)',
        duration: 'Duration (s)',
        applicationDelay: 'Application delay (s)',
    },
    customAction: {
        button: 'Custom Action',
        namePlaceholder: 'Enter action name...',
        urlPlaceholder: 'Enter custom image URL...',
        create: 'Create',
    },
    customBuff: {
        button: 'Custom Buff',
        namePlaceholder: 'Enter buff name...',
        urlPlaceholder: 'Enter custom image URL...',
        create: 'Create',
    },
    footer: {
        export: 'Export to PNG',
        addBalanceStamp: 'Add Balance Stamp',
        removeBalanceStamp: 'Remove Balance Stamp',
    },
    canvas: {
        pull: 'Pull',
        patch: 'Patch',
        levelPrefix: 'LV.',
    },
    abilityIcon: {
        frameAlt: 'icon frame',
    },
    discord: {
        mentorSignIn: 'mentor sign in',
    },
} as const

type StringifyValues<T> = {
    [K in keyof T]: T[K] extends object ? StringifyValues<T[K]> : string
}

export type Messages = StringifyValues<typeof en>
export type MessageKey = keyof Messages
