import { Job, casters, healers, jobs, melee, physRanged, tanks } from '@/data/jobs'
import { default as NextImage } from 'next/image'
import styled from 'styled-components'

const JOB_ICON_WIDTH = 40;

const JobSelectContainer = styled.div`
    display: flex;
    flex-direction: row;
    gap: 16px;
`;

const RoleContainer = styled.div`
    display: flex;
    flex-direction: row;
    gap: 2px;
`;

const JobContainer = styled.div<{ $selected?: boolean }>`
    opacity: ${({ $selected }) => $selected ? 1 : 0.33};
    border-radius: 8px;
    padding: 4px;
    cursor: pointer;
    transition: opacity 0.2s;
    &:hover {
        opacity: 1;
    }
`;

export interface JobSelectProps {
    currentJob?: Job;
    setJob: (job: Job) => void;
}

export const JobSelect = ({ currentJob, setJob }: JobSelectProps) => {
    return (
        <JobSelectContainer>
            {[tanks, healers, melee, physRanged, casters].map((role) =>
                <RoleContainer key={jobs[role[0]].name}>
                    {role.map((job) =>
                        <JobContainer key={jobs[job].name} $selected={currentJob === jobs[job]}>
                            <NextImage
                                src={jobs[job].borderedIcon}
                                alt={jobs[job].name}
                                onClick={() => setJob(jobs[job])}
                                width={JOB_ICON_WIDTH}
                                height={JOB_ICON_WIDTH}
                            />
                        </JobContainer>
                    )}
                </RoleContainer>
            )}
        </JobSelectContainer>
    );
}
