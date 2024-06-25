import { DataAction } from '@/app/api'
import { Button, Input as BaseInput } from 'antd';
import React, { useState } from 'react';
import { CSSTransition } from 'react-transition-group';
import styled from 'styled-components';

const Input = styled(BaseInput)`
    &::placeholder {
        color: #808080;
    }
`;

const ButtonContainer = styled.div`
    > * {
        font-size: 16px;
        line-height: 20px;
    }
`;

const CustomActionInputContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 60%;
    &.enter {
        opacity: 0.5;
        width: 15%;
    }
    &.enter-active {
        opacity: 1;
        width: 60%;
        transition: width 0.5s, opacity 0.5s;
    }
    &.enter-done {
        width: 60%;
    }
    &.exit {
        opacity: 1;
        width: 60%;
    }
    &.exit-active {
        opacity: 0.5;
        width: 15%;
        transition: width 0.5s, opacity 0.5s;
    }
`;

interface CustomActionInputProps {
    onCreate: (action: DataAction) => void;
}

export const CustomActionInput: React.FC<CustomActionInputProps> = ({ onCreate }) => {
    const [isClicked, toggleClicked] = useState<boolean>(false);
    const [hasError, toggleError] = useState<boolean>(false);
    const [iconUrl, setIconUrl] = useState<string>();
    const [name, setName] = useState<string>();
    
    const handleIconUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            new URL(e.target.value);
            setIconUrl(e.target.value);
        } catch {
            toggleError(true);
        }
    }

    const onCreateAction = () => {
        if (!name || !iconUrl || hasError) return;

        onCreate({
            name,
            id: encodeURI(`custom-${iconUrl}-${name}`),
            icon: new URL(iconUrl),
        });
    }

    return (
        <>
            {!isClicked &&
                <ButtonContainer>
                    <Button type="primary" onClick={() => toggleClicked(true)}>
                        Custom Action
                    </Button>
                </ButtonContainer>
            }
            <CSSTransition
                in={isClicked}
                onExit={() => toggleError(false)}
                onExited={() => toggleClicked(false)}
                timeout={500}
                unmountOnExit
            >
                <CustomActionInputContainer>
                    <Input
                        placeholder="Enter action name..."
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    <Input
                        placeholder="Enter custom image URL..."
                        value={iconUrl}
                        onChange={handleIconUrlChange}
                        status={hasError ? 'error' : undefined}
                    />
                    <Button type="primary" onClick={onCreateAction}>
                        Create
                    </Button>
                </CustomActionInputContainer>
            </CSSTransition>
        </>
    );
}
