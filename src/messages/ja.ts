import { Messages } from './en'

export const ja: Messages = {
    meta: {
        title: 'Mint Leaf',
        description: 'FFXIV Rotation Builder',
    },
    title: {
        subtitle: 'FFXIV Rotation Builder',
        logoAlt: 'ロゴ',
        language: '言語',
        balanceLink: 'The Balance FFXIV',
        balanceLogoAlt: 'The Balance Discord',
    },
    header: {
        sectionTitle: 'ヘッダー',
        job: 'ジョブ',
        rotationTitle: 'ローテーション名',
        expansion: '拡張パック',
        patch: 'パッチ',
        level: 'レベル',
    },
    defaults: {
        rotationTitle: 'タイトル',
        expansion: '黄金のレガシー',
    },
    abilities: {
        sectionTitle: 'アクション',
        actionBuilder: 'アクションビルダー',
        buffBuilder: 'バフビルダー',
        actionList: 'アクションリスト',
        rotationPlaceholder: 'ローテーションをここに貼り付け...',
        searchAction: 'アクションを検索...',
        searchStatus: 'ステータスを検索...',
        orDivider: '- または -',
    },
    actionBuilder: {
        unknown: '不明',
        item: '(アイテム)',
        custom: '(カスタム)',
        actionType: 'アクション種別',
        gcd: 'GCD',
        ogcd: 'アビ',
        appliesBuff: 'バフ付与？',
        prepull: '事前プル？',
        timeSeconds: '時間 (秒)',
        recastTime: 'リキャスト (秒)',
        castTime: 'キャスト (秒)',
        weaveLate: '遅延ウィーブ？',
        addToRotation: 'ローテーションに追加',
        clear: 'クリア',
    },
    buffBuilder: {
        unknown: '不明',
        custom: '(カスタム)',
        duration: '効果時間 (秒)',
        applicationDelay: '付与遅延 (秒)',
    },
    customAction: {
        button: 'カスタムアクション',
        namePlaceholder: 'アクション名を入力...',
        urlPlaceholder: '画像 URL を入力...',
        create: '作成',
    },
    customBuff: {
        button: 'カスタムバフ',
        namePlaceholder: 'バフ名を入力...',
        urlPlaceholder: '画像 URL を入力...',
        create: '作成',
    },
    footer: {
        export: 'PNG にエクスポート',
        addBalanceStamp: 'Balance スタンプを追加',
        removeBalanceStamp: 'Balance スタンプを削除',
    },
    canvas: {
        pull: '戦闘開始',
        patch: 'パッチ',
        levelPrefix: 'Lv.',
    },
    abilityIcon: {
        frameAlt: 'アイコンフレーム',
    },
    discord: {
        mentorSignIn: 'mentor sign in',
    },
}
