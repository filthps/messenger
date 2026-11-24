/**
 * Всплывающие окна
 */
import { useEffect, useRef } from 'react';
import { View, StyleSheet, Text, Animated, useColorScheme, Dimensions, Keyboard,Platform } from 'react-native';


export function Alert({text, head_text=null,  show_timeout=1000, close_handler=null}) {
    /**
     * Всплывающее окно - предупреждение, исчезающее - fade, с таймаутом, бес кнопок и инпутов
     */
    const theme_color = useColorScheme() || 'light';
    const opacity_wrap = useRef(new Animated.Value(0.4)).current;
    const opacity_item = useRef(new Animated.Value(1.0)).current;
    const item_move = useRef(Keyboard.isVisible() ? -250 : 0);
    let keyboard_show = null;
    let keyboard_hide = null;

    if (Platform.OS == "android" || Platform.OS == "ios") { // Сдвиг элемента с сообщением при закрытии и открытии клавиатуры
        keyboard_show = Keyboard.addListener('keyboardDidShow', () => {
            item_move.current = -250;
        });
        keyboard_hide = Keyboard.addListener('keyboardDidHide', () => {
            item_move.current = 0;
        });
    }

    useEffect(() => {
        opacity_wrap.setValue(0.4);
        opacity_item.setValue(1.0);
        let wrap_timer = setTimeout(() => {
            Animated.parallel([
                Animated.timing(opacity_wrap, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
                }),
            Animated.timing(opacity_item, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
                })
            ]).start(({finished}) => {
                if (finished && close_handler != null) {
                    close_handler();
                }
            });
        }, show_timeout);
        return () => {
            clearInterval(wrap_timer);
            if (keyboard_show) {
                keyboard_show.remove();
            }
            if (keyboard_hide) {
                keyboard_hide.remove();
            }
            item_move.current = 0;
        }
    }, [text, show_timeout]);
    return (
        <>
            <Animated.View style={[StyleSheet.absoluteFill, styles.wrap, {opacity: opacity_wrap}, 
                theme_color == "light" ? styles.background_color_light : styles.background_color_dark]}></Animated.View>
            <View style={[styles.item_wrap, StyleSheet.absoluteFill]}>
                <Animated.View style={[{opacity: opacity_item}, {marginTop: item_move.current}, 
                    styles.item, theme_color == "light" ? styles.background_color_light : styles.background_color_dark]}>
                    {(head_text == null ? null : 
                        <Text style={[styles.head_text, theme_color == "light" ? styles.h1_color_light : styles.h1_color_dark]}>{head_text}</Text>
                    )}
                    <Text style={[styles.text, theme_color == "light" ? styles.p_color_light: styles.p_color_dark]}>{text}</Text>
                </Animated.View>
            </View>
        </>
    )
};


const styles = StyleSheet.create({
    wrap: {
        zIndex: 1000,
    },
    item_wrap: {
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1,
    },
    item: {
        padding: 5,
        maxWidth: 450,
        maxHeight: 450,
        zIndex: 1001,
        borderRadius: 6,
    },
    head_text: {
        fontSize: 18,
    },
    text: {
        fontSize: 14,
    },
    h1_color_light: {
        color: "#3f3f3f",
    },
    h1_color_dark: {
        color: "#969696",
    },
    p_color_light: {
        color: "#333",
    },
    p_color_dark: {
        color: "#ababab",
    },
    background_color_light: {
        backgroundColor: "#fff",
    },
    background_color_dark: {
        backgroundColor: "#222",
    },
})
