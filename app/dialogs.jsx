import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, FlatList, Pressable, Image, TouchableOpacity, Modal } from 'react-native';
import { Link } from 'expo-router';
import { get_auth_token } from './index';


function DialogItemThumbsBlock(item) {
    let item_body = item["item"];
    let thumb = Object.hasOwn(item_body, "img") ? item_body["img"] : null;
    let username = item_body["username"];
    let thumb_url = thumb == null ? thumb : 'http://10.133.222.198:8000' + thumb;
    const [show_box, set_visible_box] = useState(false);

    return (
        <>
            {thumb_url == null ? (
                <View style={styles.default_th_image}>
                    <TouchableOpacity onPress={() => {set_visible_box(true)}}>
                        <Text style={styles.default_th_image_text} numberOfLines={1} ellipsizeMode="tail">{username}</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <TouchableOpacity onPress={() => {set_visible_box(true)}}>
                    <Image source={{uri: thumb_url}} style={styles.th_image} />
                </TouchableOpacity>
            )}
            <Modal animationType="fade" transparent={true} visible={show_box} onRequestClose={() => set_visible_box(false)}/>
        </>
    )
}

function DialogItem(item) {
    let inner = item["item"];
    let id = inner["id"];
    let body = inner["msg_body"];
    let members = inner["members_data"];
    let last_msg_is_mine = inner["is_mine"]

    return (
        <View style={styles.dialog_item}>
                <Link href={{pathname: "/messages", params: {dialog_id: id}}} asChild>
                    <TouchableOpacity>
                        <FlatList style={styles.thumbs_list} data={members} renderItem={({item}) => <DialogItemThumbsBlock item={item} />} />
                        <View style={styles.text_container}>
                            {last_msg_is_mine ? (
                                <Text numberOfLines={1} ellipsizeMode="tail" style={styles.text_body}>Вы: {body}</Text>
                            ) : (
                                <Text numberOfLines={1} ellipsizeMode="tail" style={styles.text_body}>{body}</Text>
                            )}
                        </View>
                    </TouchableOpacity>
                </Link>
        </View>
    )
 }


export default function Dialogs() {
    const [load, set_load_is_active] = useState(false);
    const [error, set_error] = useState(false);
    const [dialog_items, set_items_data] = useState(null);

    const load_dialogs = async() => {
        let request;
        let t_val = await get_auth_token();
        let header = t_val == null ? {} : {"Authorization": "Token " + t_val}
        set_load_is_active(true);
        try {
            request = await fetch("http://10.133.222.198:8000/msg/dialog-list/", {
                method: "GET",
                signal: AbortSignal.timeout(5000),
                headers: header
            });
        } catch (e) {
            set_load_is_active(true);
            return false;
        }
        if (!request.ok) {
            if (request.status == 401) {
                current_location.replace("/login/login_form");
                return true;
            }
            set_error(true);
        }
        let data;
        try {
            data = await request.json();
        } catch (error) {
            set_error(true);
            set_load_is_active(false);
            return true;
        }
        set_items_data(data["results"]);
        set_load_is_active(false);
        return true;
    }

    useEffect(() => {
        let timer = null;
        const check = async() => {
            let is_success_load = await load_dialogs();
            if (!is_success_load) {
                timer = setInterval(async() => {
                    let is_success = await load_dialogs();
                    is_success ? clearInterval(timer) : null;
                }, 5000);
            }
        };
        check();
        return () => {
            timer != null ? clearInterval(timer) : null;
        };
    }, [])
  return (
      <>
      <View style={styles.top_bar}></View>
          {load ? (
                <View style={styles.container}>
                  <ActivityIndicator />
                </View>
            ) : (
                error ? (
                        <View style={styles.container_error}>
                            <Text>Сервис недоступен</Text>
                        </View>
                    ) : (
                        <View style={styles.container}>
                            <FlatList style={styles.dialog_list} data={dialog_items} renderItem={({item}) => <DialogItem item={item} />} />
                        </View>
                        )
        )}
    <View style={styles.bottom_bar}></View>
    </>
  )
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'stretch',
        justifyContent: 'flex-start',
    },
    dialog_item: {
        flexDirection: "column",
        backgroundColor: '#fff',
        alignItems: 'stretch',
        justifyContent: 'flex-start',
        borderBottomWidth: 1,
        borderColor: "#333",
        borderStyle: "dashed",
        paddingVertical: 10,
        },
    container_error: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    top_bar: {
        backgroundColor: '#CCC',
        flexDirection: 'row',
        alignItems: 'stretch',
        justifyContent: 'flex-start',
        height: 70,
    },
    bottom_bar: {
        backgroundColor: '#CCC',
        flexDirection: 'row',
        alignItems: 'stretch',
        justifyContent: 'flex-end',
        height: 120,
        },
    thumbs_list: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        marginBottom: 5,
        },
    default_th_image: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 30,
        height: 30,
        backgroundColor: '#bbbbed',
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: '#7b7aed',
        borderRadius: 15,
        color: '#7b7aed',
        margin: 5
        },
    default_th_image_text: {
        fontSize: 8,
        },
    th_image: {
        width: 30,
        height: 30,
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: '#777777',
        borderRadius: 100,
        margin: 5,
        },
    text_container: {
        width: "100%",
        paddingHorizontal: 15,
        }
})
