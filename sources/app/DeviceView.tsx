import * as React from 'react';
import { ActivityIndicator, Image, ScrollView, Text, TextInput, View, TouchableOpacity, Platform } from 'react-native';
import { Audio } from 'expo-av';
import { rotateImage } from '../modules/imaging';
import { toBase64Image } from '../utils/base64';
import { Agent } from '../agent/Agent';
import { InvalidateSync } from '../utils/invalidateSync';
import { transcribeAudio } from '../utils/whisper';
import { keys } from '../keys';
import { Ionicons } from '@expo/vector-icons';

// Helper: Text to Speech (Web Safe)
const textToSpeech = (text: string) => {
    if (Platform.OS === 'web' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
    }
};

function usePhotos(device: BluetoothRemoteGATTServer) {
    const [photos, setPhotos] = React.useState<Uint8Array[]>([]);
    const [subscribed, setSubscribed] = React.useState<boolean>(false);

    React.useEffect(() => {
        let isMounted = true;
        (async () => {
            let previousChunk = -1;
            let buffer: Uint8Array = new Uint8Array(0);

            function onChunk(id: number | null, data: Uint8Array) {
                if (previousChunk === -1) {
                    if (id === null) return;
                    else if (id === 0) { previousChunk = 0; buffer = new Uint8Array(0); }
                    else return;
                } else {
                    if (id === null) {
                        rotateImage(buffer, '90').then((rotated) => {
                            if(isMounted) setPhotos((p) => [...p, rotated]);
                        });
                        previousChunk = -1;
                        return;
                    } else {
                        if (id !== previousChunk + 1) { previousChunk = -1; return; }
                        previousChunk = id;
                    }
                }
                buffer = new Uint8Array([...buffer, ...data]);
            }

            try {
                const service = await device.getPrimaryService('19B10000-E8F2-537E-4F6C-D104768A1214'.toLowerCase());
                const photoCharacteristic = await service.getCharacteristic('19b10005-e8f2-537e-4f6c-d104768a1214');
                await photoCharacteristic.startNotifications();
                if(isMounted) setSubscribed(true);
                
                photoCharacteristic.addEventListener('characteristicvaluechanged', (e) => {
                    let value = (e.target as any).value!;
                    let array = new Uint8Array(value.buffer);
                    if (array.length >= 2 && array[0] == 0xff && array[1] == 0xff) {
                        onChunk(null, new Uint8Array());
                    } else if (array.length >= 2) {
                        let packetId = array[0] + (array[1] << 8);
                        let packet = array.slice(2);
                        onChunk(packetId, packet);
                    }
                });

                const photoControlCharacteristic = await service.getCharacteristic('19b10006-e8f2-537e-4f6c-d104768a1214');
                await photoControlCharacteristic.writeValue(new Uint8Array([0x05]));
            } catch (e) {
                console.error("Bluetooth Error", e);
            }
        })();

        return () => { isMounted = false; };
    }, [device]);

    return [subscribed, photos] as const;
}

export const DeviceView = React.memo((props: { device: BluetoothRemoteGATTServer }) => {
    const [subscribed, photos] = usePhotos(props.device);
    const agent = React.useMemo(() => new Agent(), []);
    const agentState = agent.use();

    // Voice State
    const [recording, setRecording] = React.useState<Audio.Recording | null>(null);
    const [isRecording, setIsRecording] = React.useState(false);
    const [inputText, setInputText] = React.useState('');

    // --- TOGGLE RECORDING FUNCTION ---
    async function toggleRecording() {
        // If already recording -> STOP
        if (isRecording) {
            setIsRecording(false);
            if (recording) {
                try {
                    await recording.stopAndUnloadAsync();
                    const uri = recording.getURI(); 
                    setRecording(null);

                    if (uri) {
                        // Automatically transcribe and send
                        const text = await transcribeAudio(uri, keys.groq);
                        if (text) {
                            setInputText(text); 
                            agent.answer(text); // Auto-send!
                        }
                    }
                } catch (error) {
                    console.error("Stop Recording Error:", error);
                }
            }
        } 
        // If not recording -> START
        else {
            try {
                // Cleanup any previous recording session just in case
                if (recording) {
                    await recording.stopAndUnloadAsync();
                    setRecording(null);
                }

                const perm = await Audio.requestPermissionsAsync();
                if (perm.status !== "granted") return;
                
                await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
                const { recording: newRecording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
                
                setRecording(newRecording);
                setIsRecording(true);
            } catch (err) { 
                console.error('Mic Error:', err); 
                setIsRecording(false); 
            }
        }
    }

    // Agent Sync Logic
    const processedPhotos = React.useRef<Uint8Array[]>([]);
    const sync = React.useMemo(() => {
        let processed = 0;
        return new InvalidateSync(async () => {
            if (processedPhotos.current.length > processed) {
                let unprocessed = processedPhotos.current.slice(processed);
                processed = processedPhotos.current.length;
                await agent.addPhoto(unprocessed);
            }
        });
    }, []);
    
    React.useEffect(() => {
        processedPhotos.current = photos;
        sync.invalidate();
    }, [photos]);

    React.useEffect(() => {
        if (agentState.answer && !agentState.loading) {
            textToSpeech(agentState.answer);
        }
    }, [agentState.answer, agentState.loading]);

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            {/* Background Photos */}
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.3 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {photos.map((photo, index) => (
                        <Image key={index} style={{ width: 100, height: 100, margin: 2 }} source={{ uri: toBase64Image(photo) }} />
                    ))}
                </View>
            </View>

            {/* Main Interface */}
            <View style={{ backgroundColor: 'rgb(28 28 28)', height: 600, width: 600, borderRadius: 64, flexDirection: 'column', padding: 40, shadowColor: "#000", shadowOffset: {width: 0, height: 10}, shadowOpacity: 0.5, shadowRadius: 20 }}>
                
                {/* AI Response Area */}
                <View style={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
                    {agentState.loading ? (
                        <ActivityIndicator size="large" color="#0055FF" />
                    ) : (
                        agentState.answer ? (
                            <ScrollView style={{ flexGrow: 1, width: '100%' }}>
                                <Text style={{ color: 'white', fontSize: 28, textAlign: 'center', fontWeight: '600' }}>
                                    {agentState.answer}
                                </Text>
                            </ScrollView>
                        ) : (
                            <Text style={{ color: '#555', fontSize: 24 }}>Ready for questions...</Text>
                        )
                    )}
                </View>

                {/* Input Area */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <TextInput
                        style={{ flex: 1, color: 'white', height: 64, fontSize: 24, borderRadius: 20, backgroundColor: 'rgb(48 48 48)', paddingHorizontal: 20 }}
                        placeholder='Type or speak...'
                        placeholderTextColor={'#888'}
                        value={inputText}
                        onChangeText={setInputText}
                        readOnly={agentState.loading}
                        onSubmitEditing={(e) => agent.answer(e.nativeEvent.text)}
                    />

                    {/* NEW TOGGLE MIC BUTTON */}
                    <TouchableOpacity
                        style={{
                            height: 64, width: 64, borderRadius: 32,
                            // Red when recording, Blue when idle
                            backgroundColor: isRecording ? '#FF3B30' : '#0055FF',
                            justifyContent: 'center', alignItems: 'center',
                            // Add a border when recording to make it obvious
                            borderWidth: isRecording ? 3 : 0,
                            borderColor: 'white'
                        }}
                        // Use onPress instead of PressIn/PressOut
                        onPress={toggleRecording}
                    >
                        {/* Change icon based on state */}
                        <Ionicons 
                            name={isRecording ? "stop" : "mic"} 
                            size={32} 
                            color="white" 
                        />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
});