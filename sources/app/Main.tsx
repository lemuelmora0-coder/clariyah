import * as React from 'react';
import { SafeAreaView, StyleSheet, View, Text, StatusBar, Platform } from 'react-native';
import { RoundButton } from './components/RoundButton';
import { Theme } from './components/theme';
import { useDevice } from '../modules/useDevice';
import { DeviceView } from './DeviceView';

export const Main = React.memo(() => {
    const [device, connectDevice] = useDevice();
    
    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            
            {/* BIG CLARIFEYE HEADER */}
            <View style={styles.headerContainer}>
                <Text style={styles.logoText}>CLARIFEYE</Text>
                <View style={styles.accentLine} />
                <Text style={styles.tagline}>AI ASSISTIVE VISION</Text>
            </View>

            <View style={styles.content}>
                {!device ? (
                    <View style={styles.connectContainer}>
                        <View style={styles.infoCard}>
                            <Text style={styles.infoTitle}>Ready to see?</Text>
                            <Text style={styles.infoSubtitle}>
                                Connect your smart glasses to begin the AI-powered experience.
                            </Text>
                        </View>
                        
                        <View style={styles.buttonWrapper}>
                            <RoundButton 
                                title="PAIR DEVICE" 
                                action={connectDevice} 
                            />
                        </View>
                    </View>
                ) : (
                    <DeviceView device={device} />
                )}
            </View>

            {/* FOOTER DECORATION */}
            {!device && (
                <View style={styles.footer}>
                    <Text style={styles.footerText}>STEM 11 • RESEARCH PROJECT • LEMUEL MORA • JUMARC AERON RAGUINE • ALLIYAH REIGHNE GARCIA </Text>
                </View>
            )}
        </SafeAreaView>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000', // True Black for accessibility and OLED screens
    },
    headerContainer: {
        marginTop: Platform.OS === 'android' ? 40 : 20,
        alignItems: 'center',
        paddingVertical: 20,
    },
    logoText: {
        fontSize: 48,
        fontWeight: '900',
        color: '#0055FF', // Clarifeye Brand Blue
        letterSpacing: 6,
        textAlign: 'center',
    },
    accentLine: {
        width: 60,
        height: 4,
        backgroundColor: '#FFFFFF', // High-contrast Yellow accent
        marginTop: 5,
        borderRadius: 2,
    },
    tagline: {
        fontSize: 12,
        color: '#FFFFFF',
        letterSpacing: 3,
        marginTop: 10,
        fontWeight: '600',
        opacity: 0.8,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 30,
    },
    connectContainer: {
        alignItems: 'center',
    },
    infoCard: {
        backgroundColor: '#111111',
        padding: 25,
        borderRadius: 20,
        width: '100%',
        marginBottom: 40,
        borderWidth: 1,
        borderColor: '#222222',
        alignItems: 'center',
    },
    infoTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 10,
    },
    infoSubtitle: {
        fontSize: 16,
        color: '#AAAAAA',
        textAlign: 'center',
        lineHeight: 22,
    },
    buttonWrapper: {
        shadowColor: '#0055FF',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 15,
        elevation: 10,
    },
    footer: {
        paddingBottom: 20,
        alignItems: 'center',
    },
    footerText: {
        color: '#444444',
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 2,
    },
});