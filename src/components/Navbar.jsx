import "../styles/Navbar.css";
import React from "../fakeReact";

const scrollToSection = (id) => {
  const section = document.getElementById(id);
  section && section.scrollIntoView({ behavior: "smooth" });
};

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="nav-logo">以下3个组件是由自定义React实现的</div>
      <div className="nav-links">
        <button onClick={() => scrollToSection("MusicPlayer")}>
          MusicPlayer
        </button>
        <button onClick={() => scrollToSection("TicTacToe")}>TicTacToe</button>
        <button onClick={() => scrollToSection("ToDoList")}>ToDoList</button>
      </div>
    </nav>
  );
};

export default Navbar;
