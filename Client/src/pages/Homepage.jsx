import SideBar from '../components/SideBar'
import Chatcontainer from '../components/ChatContainer'
import RightSidebar from '../components/RightSidebar'
import { useContext } from 'react'
import { ChatContext } from '../context/chatContext'

function Homepage() {
    const {selectedUser} = useContext(ChatContext) 
    return (
        <div className='w-full h-screen '>
            <div className={`backdrop-blur-xl border-2 border-gray-600 rounded-2xl 
                overflow-hidden h-[100%] grid grid-cols-1 relative ${selectedUser ?
                'md:grid-cols-[1fr_1.5fr_1fr] xl:grid-cols-[1fr_2fr_1fr]' : 'md:grid-cols-2'}`}>
                
                <SideBar />
                
                <Chatcontainer />
                
                <RightSidebar />
            </div>
        </div>
    )
}

export default Homepage
