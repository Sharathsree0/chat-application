import assets from '../assets/assets'
import { useState } from 'react'
import { useContext } from 'react'
import { AuthContext } from '../context/authContext'
import { useNavigate } from 'react-router-dom'

function Loginpage() {
    const [currentState,setCurrentState]= useState("Sign up")
    const [fullName,setFullName ]= useState("")
    const [email,setEmail ]= useState("")
    const [password,setPassword ]= useState("")
    const [bio,setBio ]= useState("")
    const [isSubmitted,setIsSubmitted ]= useState(false)
    const navigate = useNavigate();

    const {login} =useContext(AuthContext)
const onSubmitHandler=async(e)=>{
    e.preventDefault();

    if(currentState === "Sign up" && !isSubmitted){
        setIsSubmitted(true)
        return;
    }
    const success= await login(currentState==="Sign up" ? 'signup':'login',{fullName,email,password,bio})
    if(success){
     navigate("/");
  }
}

  return (
    <div className='min-h-screen bg-cover bg-center flex items-center
    justify-center gap-8 sm:justify-evenly max-sm:flex-col backdrop-blur-2xl'>
        <img src={assets.logo_big} alt="" className='w-[min(30vw,250px)]' />
        <form onSubmit={onSubmitHandler} className='border-2 bg-white/8 text-white border-gray-500 p-6 flex flex-col gap-6 rounded-lg'>
            <h2 className='font-medium text-2xl flex justify-between items-center '>
                {currentState}
                {isSubmitted && <img onClick={()=>setIsSubmitted(false)} src={assets.arrow_icon} alt="" className='w-5 cursor-pointer' /> }
            </h2>
            {currentState === "Sign up" &&  !isSubmitted && (
<input type="text" onChange={(e)=>setFullName(e.target.value)} value={fullName} className='p-2 border border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500'
 placeholder='Full name ' required />
 
 )}
{!isSubmitted &&(
    <>
    <input type="email" placeholder='Email address' required onChange={(e)=>setEmail(e.target.value)} value={email} 
    className='p-2 border border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500' />
    
    <input type="password" placeholder='Password' required onChange={(e)=>setPassword(e.target.value)} value={password} 
    className='p-2 border border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500' />
    
    </>
)}
         {
currentState === "Sign up" && isSubmitted && (
                <textarea onChange={(e)=>setBio(e.target.value)} value={bio}
                rows={4} className='p-2 border border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500' 
                placeholder='your short bio...'  ></textarea>
             )
         }  
         <button type='submit' className='py-3 bg-gradient-to-r from-purple-400 to-violet-600 text-white rounded-md cursor-pointer'>
            {currentState === "Sign up" ? "Create Account":"Login now"}
         </button>
         <div className='flex items-center gap-2 text-sm text-gray-500'>
            <input type="checkbox" />
            <p>Agree the terms and conditions</p>
         </div>
         <div className='flex flex-col gap-2'>
            {currentState === "Sign up" ? (
                <p className='text-sm text-gray-600'>
                    Already have an account? 
                    <span onClick={()=>{setCurrentState("Login");setIsSubmitted(false)}} className='font-medium text-violet-500 cursor-pointer'>
                        Login here</span>
                </p>
            )
            :(
                <p className='text-sm text-gray-600'>
                    Create an account 
                    <span onClick={()=>setCurrentState("Sign up")} className='font-medium text-violet-500 cursor-pointer'>
                        Click here</span> 
                </p>
            ) }
         </div>

        </form>
    </div>
  )
}

export default Loginpage