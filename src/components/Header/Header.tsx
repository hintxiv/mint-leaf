import { Job } from '@/data/jobs'
import styled from 'styled-components'
import { JobSelect } from './JobSelect'
import { Input as AntdInput } from 'antd'

const HeaderContainer = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    background-color: #262833;
    color: white;
    width: 100%;
    border-bottom: 1px solid white;
    height: 200px;
`;

const HeaderTitle = styled.h1`
    margin: 0;
    height: calc(100% - 32px);
    padding: 16px;
    border-right: 1px solid white;
    align-content: center;
    text-align: center;
    font-size: 1.5em;
    width: 150px;
`;

const HeaderOptions = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 16px 32px;
`;

const HeaderOptionSuperRow = styled.div`
    display: flex;
    flex-direction: row;
    gap: 32px;
    align-items: center;
`;

const HeaderOptionRow = styled.div`
    display: flex;
    flex-direction: row;
    gap: 16px;
    align-items: center;
    font-size: 1.25em;
    white-space: nowrap;
`;

const Input = styled(AntdInput)`
    font-size: 18px;
`;

interface HeaderProps {
    currentJob?: Job;
    setJob: (job: Job) => void;
    title: string;
    setTitle: (title: string) => void;
    expansion: string;
    setExpansion: (expansion: string) => void;
    patch: string;
    setPatch: (patch: string) => void;
    level: number;
    setLevel: (level: number) => void;
}

export const Header = ({
    currentJob, setJob,
    title, setTitle,
    expansion, setExpansion,
    patch, setPatch,
    level, setLevel,
}: HeaderProps) => {
    return (
        <HeaderContainer>
            <HeaderTitle>Header</HeaderTitle>
            <HeaderOptions>
                <HeaderOptionRow>
                    <span>Job</span>
                    <JobSelect currentJob={currentJob} setJob={setJob} />
                </HeaderOptionRow>
                <HeaderOptionRow>
                    <span>Rotation Title</span>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                </HeaderOptionRow>
                <HeaderOptionSuperRow>
                    <HeaderOptionRow>
                        <span>Expansion</span>
                        <Input value={expansion} onChange={(e) => setExpansion(e.target.value)} />
                    </HeaderOptionRow>
                    <HeaderOptionRow>
                        <span>Patch</span>
                        <Input value={patch} onChange={(e) => setPatch(e.target.value)} />
                    </HeaderOptionRow>
                    <HeaderOptionRow>
                        <span>Level</span>
                        <Input type="number" value={level} onChange={(e) => setLevel(parseInt(e.target.value))} />
                    </HeaderOptionRow>
                </HeaderOptionSuperRow>
            </HeaderOptions>
        </HeaderContainer>
    );
}
