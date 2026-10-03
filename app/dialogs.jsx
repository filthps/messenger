import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, FlatList, Pressable, Image, TouchableOpacity, Modal, Button } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { host, get_auth_token } from './index';


function DialogItemThumbsBlock({item}) {
    const router = useRouter();
    let id = item["user_id"]
    let thumb = Object.hasOwn(item, "img") ? item["img"] : null;
    let big_thumb = Object.hasOwn(item, "sm_profile_thumb") ? item["sm_profile_thumb"] : null;
    let username = item["username"];
    let thumb_url = thumb == null ? thumb : host + thumb;
    let big_thumb_url = big_thumb == null ? big_thumb : host + big_thumb;
    const [show_box, set_visible_box] = useState(false);

    return (
        <>
            {thumb_url == null ? (
                <TouchableOpacity onPress={() => {set_visible_box(true)}} asChild>
                    <View style={styles.default_th_image}>
                        <Text style={styles.default_th_image_text} numberOfLines={1} ellipsizeMode="tail">{username}</Text>
                    </View>
                </TouchableOpacity>
            ) : (
                <TouchableOpacity onPress={() => {set_visible_box(true)}}>
                    <Image source={{uri: thumb_url}} style={styles.th_image} />
                </TouchableOpacity>
            )}
            <Modal animationType="fade" transparent={true} visible={show_box} onRequestClose={() => set_visible_box(false)}>
                <View style={styles.modal_inner}>
                    {big_thumb_url == null ? (
                        <View style={styles.big_default_thumb}>
                            <Text style={styles.big_th_image_text}>{username}</Text>
                        </View>
                    ) : (
                        <Image source={{uri: big_thumb_url}} style={styles.big_th_image} />
                    )}
                    <Text style={styles.mini_profile_username}>{username}</Text>
                    <Pressable onPress={() => {router.push(host + "/msg/user/" + id + "/about/")}}>
                        <Text style={styles.mini_profile_link_text}>О пользователе</Text>
                    </Pressable>
                    <Button onPress={() => set_visible_box(false)} title="Скрыть">
                    </Button>
                </View>
            </Modal>
        </>
    )
}


function DialogItem({item}) {
    let id = item["id"];
    let body = item["msg_body"];
    let members = item["members_data"];
    let last_msg_is_mine = item["is_mine"];

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
    const [dialog_items, set_items_data] = useState([]);
    const [page, set_page] = useState(1);

    const load_dialogs = async() => {
        if (page == null || load) {
            return true;
        }
        let request;
        let t_val = await get_auth_token();
        let header = t_val == null ? {} : {"Authorization": "Token " + t_val};
        page == 1 ? set_load_is_active(true) : null;
        try {
            request = await fetch(host + "/msg/dialog-list/?p=" + page, {
                method: "GET",
                signal: AbortSignal.timeout(5000),
                headers: header
            });
        } catch (e) {
            set_load_is_active(false);
            return false;
        }
        if (!request.ok) {
            if (request.status == 401) {
                current_location.replace("/login");
                return true;
            }
            set_error(true);
            set_load_is_active(false);
        }
        let data;
        try {
            data = await request.json();
        } catch (error) {
            set_error(true);
            set_load_is_active(false);
            return true;
        }
        if (!Object.hasOwn(data, "results") || !Object.hasOwn(data, "next") ||
            !Object.hasOwn(data, "previous")) {
            set_error(true);
            set_load_is_active(false);
            return true;
        }
        if (data["next"] == null) {
            set_page(null);
        } else {
            set_page(page + 1);
        }
        let items = dialog_items;
        if (!data["results"].length) {
            set_load_is_active(false);
            return true;
        }
        set_items_data([...items, ...data["results"]]);
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
            set_load_is_active(false);
            set_page(1);
            set_items_data([]);
            set_error(false);
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
                            {!dialog_items ? (
                                <>
                                    <Text>Пока что пусто</Text>
                                    <Text>Выберите себе собеседника или сразу несколько</Text>
                                </>
                            ) : (
                                <FlatList data={dialog_items} renderItem={({item}) => <DialogItem item={item} />}
                                    onEndReached={load_dialogs} ListFooterComponent={load ? <ActivityIndicator /> : null}
                                     onEndReachedThreshold={0.1}/>
                            )}
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
        width: 50,
        height: 50,
        backgroundColor: '#bbbbed',
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: '#7b7aed',
        borderRadius: 25,
        color: '#7b7aed',
        margin: 5
        },
    big_default_thumb: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 150,
        height: 150,
        backgroundColor: '#bbbbed',
        borderWidth: 2,
        borderStyle: "solid",
        borderColor: '#7b7aed',
        borderRadius: 75,
        color: '#7b7aed',
        },
    default_th_image_text: {
        fontSize: 8,
        },
    big_th_image_text: {
        fontSize: 16,
        },
    mini_profile_link_text: {
        fontSize: 16,
        color: '#7b7aed',
        fontStyle: "bold",
        },
    th_image: {
        width: 50,
        height: 50,
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: '#777777',
        borderRadius: 25,
        margin: 5,
        },
    big_th_image: {
        width: 150,
        height: 150,
        borderWidth: 2,
        borderStyle: "solid",
        borderColor: '#777777',
        borderRadius: 75,
        },
    text_container: {
        width: "100%",
        paddingHorizontal: 15,
        },
    mini_profile_username: {
        textAlign: "center",
        fontSize: 24,
        fontStyle: "bold",
        color: '#7b7aed',
        },
    modal_inner: {
        height: "80%",
        backgroundColor: "rgba(255, 255, 255, 0.7)",
        alignItems: 'center',
        justifyContent: 'space-evenly',
        }
});
