import { useState, useEffect } from "react";
import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";
import { RiCloseFill } from "react-icons/ri";
import { COLORS } from "@constants/constants";

const Message = ({ message, isError, bottomOffset }) => {
  const fadeInOut = keyframes`
    0% { opacity: 0; }
    8% { opacity: 1; }
    92% { opacity: 1; }
    100% { opacity: 0; }
  `;

  const progressAnimation = keyframes`
    from { width: 100%; }
    to { width: 0%; }
  `;

  const ErrorContainer = styled.div`
    position: fixed;
    bottom: ${(props) => 40 + props.bottomOffset}px;
    right: 40px;
    width: 40%;
    padding: 20px 20px 20px 35px;
    background-color: #262626;
    color: white;
    border-radius: 5px;
    animation: ${fadeInOut} 6s forwards;
    z-index: 1000;
    box-shadow: 0px 10px 15px rgba(0, 0, 0, 0.5); // Adding a big drop shadow

    @media (max-width: 800px) {
      width: 90%;
      right: 5%;
      left: 5%;
    }
  `;

  const ProgressMeter = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    height: 10px;
    width: 100%;
    border-top-left-radius: 5px;
    border-top-right-radius: 5px;
    background: ${isError ? "#c93e3e" : COLORS.PrimaryPink};
    animation: ${progressAnimation} 6s linear forwards;
  `;

  const CloseButton = styled.span`
    position: absolute;
    top: 15px;
    left: 8px;
    cursor: pointer;
    font-weight: bold;
  `;

  const [isVisible, setIsVisible] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 6000);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <ErrorContainer bottomOffset={bottomOffset}>
      <ProgressMeter />
      <CloseButton onClick={() => setIsVisible(false)}>
        <RiCloseFill color="#FFFFFF" size={20} />
      </CloseButton>
      {message}
    </ErrorContainer>
  );
};

export default Message;
