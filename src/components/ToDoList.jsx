import React from "../fakeReact";
import "../styles/TodoList.css";

const { useState } = React;

function TodoList() {
  const [todos, setTodos] = useState([]);
  const [inputValue, setInputValue] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    setTodos([
      ...todos,
      { id: Date.now(), text: inputValue, completed: false },
    ]);
    setInputValue("");
  };

  const toggleTodo = (id) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const deleteTodo = (id) => {
    setTodos(todos.filter((todo) => todo.id !== id));
  };

  return (
    <div className="todo-container">
      <h1>待办事项</h1>
      <form onSubmit={handleSubmit} className="todo-form">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="添加新的待办事项..."
          className="todo-input"
        />
        <button type="submit" className="todo-button">
          添加
        </button>
      </form>
      <ul className="todo-list">
        {todos.map((todo) => (
          <li
            key={todo.id}
            className={`todo-item ${todo.completed ? "completed" : ""}`}
          >
            <span onClick={() => toggleTodo(todo.id)}>{todo.text}</span>
            <button
              onClick={() => deleteTodo(todo.id)}
              className="delete-button"
            >
              删除
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TodoList;
