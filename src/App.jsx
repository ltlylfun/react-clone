import React from "./fakeReact";
import Navbar from "./components/Navbar";
import MusicPlayer from "./components/MusicPlayer";
import TicTacToe from "./components/TicTacToe";
import ToDoList from "./components/ToDoList";
import "./styles/App.css";

const App = () => {
  return (
    <>
      <Navbar />
      <div id="MusicPlayer" className="section-container">
        <MusicPlayer />
      </div>
      <div id="TicTacToe" className="section-container">
        <TicTacToe />
      </div>
      <div id="ToDoList" className="section-container">
        <ToDoList />
      </div>
    </>
  );
};

export default App;
