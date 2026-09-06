import { encodeCustomId } from '@/lib/customId'
import { DataAction } from '@/app/api'
import { Button, Input as BaseInput } from 'antd';
import React, { useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from '@/context/LanguageContext'

const Input = styled(BaseInput)`
    width: 100%;

    &::placeholder {
        color: #808080;
    }
`;

const ButtonContainer = styled.div`
    width: 100%;

    > * {
        width: 100%;
        font-size: 14px;
        line-height: 20px;
    }
`;

const FormContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
    width: 100%;
`;

const ActionButtons = styled.div`
    display: flex;
    flex-direction: row;
    gap: 8px;
    width: 100%;

    > * {
        flex: 1;
    }
`;

interface CustomActionInputProps {
    onCreate: (action: DataAction) => void
}

export const CustomActionInput: React.FC<CustomActionInputProps> = ({ onCreate }) => {
    const { t } = useTranslation()
    const [isOpen, setIsOpen] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [iconUrl, setIconUrl] = useState('');
    const [name, setName] = useState('');

    const resetForm = () => {
        setName('');
        setIconUrl('');
        setHasError(false);
    }

    const closeForm = () => {
        setIsOpen(false);
        resetForm();
    }

    const handleIconUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setIconUrl(value);
        if (value.trim() === '') {
            setHasError(false);
            return;
        }
        try {
            new URL(value);
            setHasError(false);
        } catch {
            setHasError(true);
        }
    }

    const onCreateAction = () => {
        if (!name || !iconUrl || hasError) return;

        onCreate({
            name,
            id: encodeCustomId(iconUrl, name),
            icon: new URL(iconUrl),
        });
        closeForm();
    }

    if (!isOpen) {
        return (
            <ButtonContainer>
                <Button type="primary" onClick={() => setIsOpen(true)}>
                    {t('customAction.button')}
                </Button>
            </ButtonContainer>
        );
    }

    return (
        <FormContainer>
            <Input
                placeholder={t('customAction.namePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
            />
            <Input
                placeholder={t('customAction.urlPlaceholder')}
                value={iconUrl}
                onChange={handleIconUrlChange}
                status={hasError ? 'error' : undefined}
            />
            <ActionButtons>
                <Button type="primary" onClick={onCreateAction}>
                    {t('customAction.create')}
                </Button>
                <Button onClick={closeForm}>
                    {t('customAction.cancel')}
                </Button>
            </ActionButtons>
        </FormContainer>
    );
}
