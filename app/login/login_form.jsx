import { StyleSheet, Text, View, TextInput, Button } from 'react-native';

export default function Login() {
    return (
        <View>
            <Text>Логин:</Text>
            <Text>Пароль:</Text>
            <Button tittle="Вход" />
        </View>
        )
    }

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    input_: {
    marginTop: 16,
    paddingVertical: 8,
    borderWidth: 4,
    borderRadius: 6,
    backgroundColor: '#61dafb',
    color: '#20232a',
    textAlign: 'center',
    fontSize: 30,
    fontWeight: 'bold',

    }
});
