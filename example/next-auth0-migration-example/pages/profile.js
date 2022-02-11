// This import is only needed when checking authentication status directly from getInitialProps
import { useFetchUser } from '../lib/user'
import Layout from '../components/layout'
import { supabase } from '../lib/initSupabase'

function ProfileCard({ user }) {
  const getUser = async () => {
    const { user } = await supabase.auth.api.getUser()
    console.log(user)
  }
  return (
    <>
      <h1>Profile</h1>
      <button onClick={getUser}>click</button>
      <div>
        <h3>Profile (client rendered)</h3>
        <img src={user.user_metadata.picture} alt="user picture" />
        <p>nickname: {user.user_metadata.user_name}</p>
        <p>name: {user.user_metadata.name}</p>
        <p>email: {user.email}</p>
      </div>
    </>
  )
}

function Profile() {
  const { user, loading } = useFetchUser({ required: true })

  return (
    <Layout user={user} loading={loading}>
      {loading ? <>Loading...</> : <ProfileCard user={user} />}
    </Layout>
  )
}

export default Profile
