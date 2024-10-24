import { useEffect, useRef } from 'react';

type Props = {
    messages: string[]
}

export default function Log({messages}: Props) {
    const container = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if(container === null || container.current === null) return;
        container.current.scrollTo(
            0,
            container.current.offsetHeight + (messages.length * 100)
        );
    }, [messages]);

    const mapMessages = () => {
        return messages.map((message, index) => {
            return (
                <p key={`message-${index}`} className="message">
                    {message}
                </p>
            )
        })
    }

    return (
        <div className="gamelog gamelog_pos">
            <div className="gamelog_message_group" ref={container} >{mapMessages()}</div>
        </div>
    )
}