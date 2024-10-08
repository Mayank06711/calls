import Login from "./Components/Login"
import backgroundImage from "./assets/loginBackground.jpg";


function App() {
  return (
    <div className="relative flex justify-center items-center h-[100vh]">
    <div className="absolute inset-0  " style={{
      backgroundImage:`url(${backgroundImage})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      opacity:0.05,
      zIndex:0
    }}>
      
    </div>
    <Login/>
    </div>
  )
}

export default App
