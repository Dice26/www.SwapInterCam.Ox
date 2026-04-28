/**
 * OBS Virtual Camera Integration
 */
class OBSVirtualCameraIntegration {
    constructor() {
        this.obsAvailable = false;
        this.obsDeviceId = null;
    }

    async checkOBSAvailability() {
        if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
            return false;
        }
        
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const obsCamera = devices.find(device => 
                device.kind === 'videoinput' && 
                device.label.toLowerCase().includes('obs')
            );
            
            this.obsAvailable = !!obsCamera;
            if (obsCamera) {
                this.obsDeviceId = obsCamera.deviceId;
            }
            
            return this.obsAvailable;
        } catch (error) {
            console.warn('Camera detection failed:', error);
            return false;
        }
    }

    async getCameraStream(constraints = {}) {
        if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
            return null;
        }
        
        try {
            if (this.obsAvailable && this.obsDeviceId) {
                return await navigator.mediaDevices.getUserMedia({
                    video: { deviceId: { exact: this.obsDeviceId } },
                    audio: constraints.audio || false
                });
            } else {
                return await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: constraints.audio || false
                });
            }
        } catch (error) {
            console.error('Camera access failed:', error);
            throw error;
        }
    }
}

window.obsIntegration = new OBSVirtualCameraIntegration();