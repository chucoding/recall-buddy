import React, { useEffect, useState, useRef } from 'react';
import Slider from "react-slick";

import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

import MarkdownBlock from '../templates/MarkdownBlock';
import { useIndexedDB } from "react-indexed-db-hook";

interface Card {
  question: string;
  answer: string;
}

interface DBData {
  date: string;
  data: Card[];
}

const FlashCardViewer: React.FC = () => {
    const [cards, setCards] = useState<Card[]>([]);
    const [flipped, setFlipped] = useState<boolean>(false);

    let sliderRef = useRef<Slider>(null);
    
    const next = () => {
        setFlipped(false);
        sliderRef.current?.slickNext();
    };
    
    const previous = () => {
        setFlipped(false);
        sliderRef.current?.slickPrev();
    };

    const flipCard = () => {
        setFlipped(!flipped);
    };

    const { getAll } = useIndexedDB("data");
    
    useEffect(() => {
        getAll().then((dataFromDB: DBData[]) => {
            if (dataFromDB && dataFromDB.length > 0) {
                setCards(dataFromDB[0].data);
            }
        });
    }, [getAll]);
    
    if (cards.length === 0) {
        return (
            <div style={{
                display: "flex", 
                height: "100vh", 
                alignItems: "center", 
                justifyContent: "center", 
                background: "lightgray", 
                fontSize: "larger"
            }}>
                질문을 생성하고 있습니다.<br/>잠시만 기다려주세요.
            </div>
        );
    }

    return (
        <div className='card-player'>
            <div>
                <Slider
                    ref={slider => {
                        sliderRef.current = slider;
                    }}
                    dots={true}
                    arrows={false}
                    swipe={false}
                    infinite={false}
                    appendDots={(dots) => (
                        <div style={{ top:'10px'}}>
                            <ul style={{ padding:'0px' }}>{dots}</ul>
                        </div>
                    )}
                >
                    {cards.map((card, i) =>
                        <div key={i} className={`flashcard ${flipped ? 'flipped' : ''}`}>
                            {flipped ? <MarkdownBlock markdown={card.answer} /> : <p>{card.question}</p> } 
                        </div>
                    )}                       
                </Slider>
            </div>
            <div className='button-wrapper'>
                <button className='button-circle' onClick={previous}>
                ⬅️
                </button>
                <button className='button-oval' onClick={flipCard}>🔃</button>
                <button className='button-circle' onClick={next}>
                ➡️
                </button>
            </div>
        </div>
    );
};

export default FlashCardViewer;
