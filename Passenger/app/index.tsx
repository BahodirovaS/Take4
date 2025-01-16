import { useAuth } from "@clerk/clerk-expo";
import { Redirect } from "expo-router";
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

const Home = () => {

  const { isSignedIn } = useAuth()

  if (isSignedIn) {
    return <Redirect href={'/(root)/(tabs)/home'} />
  }

  return <Redirect href={'/(auth)/welcome'} />

}

export default Home;
