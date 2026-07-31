import React, {Component} from 'react';
import P5Wrapper from 'react-p5-wrapper';
import sketch from './sketch';
import {createSessionStore} from './data/createSessionStore';
import {gpsData, setupGPS, clearWatchGPS} from './gps';
import {NameModal} from './NameModal';
import {IntroModal} from './IntroModal';
import { LocHintModal } from './LocHintModal';
import {withEffectivePresence} from './sessionPresence';

const SESSION_ID = 'generative_geo_id';
const SESSION_NAME = 'generative_name';
const SESSION_TIME = 'generative_geo_id_time';
const defaultSessionStore = createSessionStore();

class LocData extends Component {
    latestPosition = null;
    latestLocations = {};

    state = {
        gp: {},
        gpsPermission: null,
        key: null,
        currentPosition: null,
        //allLocations: [],
        dataPoint: []
    }
    gpsPermit = (b, position) => {
        if (position) this.latestPosition = position;
        this.setState({
            gpsPermission: b,
            ...(position ? {currentPosition: position} : {}),
        });
        if (b && position && this.state.key) {
            this.props.sessionStore.updatePosition(
                this.state.key,
                position
            ).catch((error) => {
                console.error('Unable to update location session', error);
            });
        }
    }

    componentDidMount() {
        //this.initGPS();
        //console.log('setupGPS');
        setupGPS(this.gpsPermit);
        this.unsubscribeSessions = this.props.sessionStore.subscribeSessions(
            this.updateDataSet
        );
        this.presenceTimer = setInterval(() => {
            this.updateDataSet(this.latestLocations);
        }, 5000);
    }

    componentWillUnmount() {
        if (this.unsubscribeSessions) this.unsubscribeSessions();
        if (this.presenceTimer) clearInterval(this.presenceTimer);
        clearWatchGPS();
        if (this.props.sessionStore.dispose) this.props.sessionStore.dispose();
    }

    initGPS = () => {
        
    }

    updateDataSet = (allLocations) => {
        this.latestLocations = allLocations || {};
        this.setState({
            dataPoint: Object.entries(this.latestLocations)
            .filter(([id, value]) =>
                id !== this.state.key &&
                id !== gpsData.key &&
                value &&
                Number.isFinite(Number(value.lat)) &&
                Number.isFinite(Number(value.lon)) &&
                Number.isFinite(Number(value.timeStamp))
            )
            .map(([id, value]) => ({
                ...withEffectivePresence(value),
                key: id,
                showId: value.showId || getShowId(id),
            }))

        })
    }

    startListen = (key) => {
        this.setState({key: key}, () => {
            if (this.latestPosition) {
                this.props.sessionStore.updatePosition(
                    key,
                    this.latestPosition
                ).catch((error) => {
                    console.error('Unable to update initial location session', error);
                });
            }
        });
    }
     

    render() {
        let {gpsPermission} = this.state;
        return (<>
            <LocHintModal show={gpsPermission===false}/>
            <IntroModal show={false}/>
            {gpsPermission && <ControlPanel dataPoint={this.state.dataPoint}
                currentPosition={this.state.currentPosition}
                done={this.startListen}
                sessionStore={this.props.sessionStore}/>
            }
            </>
        );
    }
}

class ControlPanel extends Component {
    state = {
        data: {
            globalScale: 250000,
            globalPow: 0.58,
            maxLineLength: 100,
            radioSpeed: 0.5/2*Math.PI,
            lat: gpsData.lat,
            lon: gpsData.lon,
            centerName: 'center'
        }, 
        name: 'center',
        naming: false,
        key: null,
        //GUI: new dat.GUI()
    }

    componentDidMount() {
        
        this.addGPSKey();
        this.setState({naming: true});
        window.addEventListener("beforeunload", this.handleWindowBeforeUnload);
        //let dataStore = sessionStorage.getItem('controlData');
        //console.log(dataStore);
        //let {data, GUI} = this.state;
        //if (dataStore) {
        // data = JSON.parse(dataStore);
        //     this.setState({
        //         data: data
        //     })
        //} 
        // const btn = {'add config': this.saveControlData};
        // GUI.add(data,"globalScale",1000,800000)
        // GUI.add(data,"globalPow",0,0.99)
        // GUI.add(data,"maxLineLength")
        // GUI.add(data,'radioSpeed',0,3,0.01)
        // GUI.add(data,'centerName')
        // GUI.add(data,'lat',-90,90,0.01)
        // GUI.add(data,'lon',-180,180,0.01)
        // GUI.add(btn, 'add config');

        // GUI.close()
    }

    componentDidUpdate(previousProps) {
        const previous = previousProps.currentPosition;
        const current = this.props.currentPosition;
        if (current && (!previous ||
            current.lat !== previous.lat || current.lon !== previous.lon)) {
            this.setState({
                data: {
                    ...this.state.data,
                    lat: current.lat,
                    lon: current.lon,
                },
            });
        }
    }

    componentWillUnmount() {
        window.removeEventListener("beforeunload", this.handleWindowBeforeUnload);
        if (this.state.key) {
            this.props.sessionStore.endSession(this.state.key).catch(() => {});
        }
    }

    addGPSKey = () => {
        //console.log('add gps key');
        let myId;
        let showId;
        let lastId = localStorage.getItem(SESSION_ID)
        let lastIdTime = localStorage.getItem(SESSION_TIME)

        if (lastId && (Date.now() - lastIdTime < 60*60*1000)){
            //console.log("Old Id Detected! use " + lastId)
            myId = lastId
            localStorage.setItem(SESSION_TIME, Date.now())
            showId = localStorage.getItem(SESSION_NAME);
        } else{
            myId = this.props.sessionStore.reserveSessionId();
            showId = getShowId(myId);
            //console.log("Generate new id " + myId)
            localStorage.setItem(SESSION_ID,myId)
            localStorage.setItem(SESSION_TIME, Date.now())
        }
        
        gpsData.key = myId;
        if (!showId)
            showId = getShowId(myId);
        gpsData.showId = showId;

        this.setState({key:myId});
        this.props.sessionStore.startSession(myId, gpsData).catch((error) => {
            console.error('Unable to start location session', error);
        });
        this.props.done(myId);
        this.changeCenterName(showId, false);
    }

    changeCenterName = (name, updateFirebase) => {
        localStorage.setItem(SESSION_NAME, name);
        if (updateFirebase && this.state.key) {
            this.props.sessionStore.renameSession(this.state.key, name).catch((error) => {
                console.error('Unable to rename location session', error);
            });
            this.props.done(this.state.key);
        }
        this.setState({data:{...this.state.data, centerName: name}, name: name});

    }
    
    saveControlData = () => {
        let {data} = this.state;
        sessionStorage.setItem('controlData', JSON.stringify({...data}));
    }

    handleWindowBeforeUnload = (e) => {
        if (this.state.key) {
            this.props.sessionStore.endSession(this.state.key).catch(() => {});
        }
    }

    render() {
        const {data} = this.state;
        let {dataPoint} = this.props;

        return (
            <>
            <NameModal show={this.state.naming} name={this.state.name} 
                        onChange={this.changeCenterName}/>
            <P5Wrapper sketch={sketch} dataPoint={dataPoint}
                    configData={data} myId={this.state.key}/>
            </>
        )


    }

}

const getShowId = (id) => {
    return "A" + (id.split("").map(ch=>ch.charCodeAt(0)).reduce((a,b)=>(a*b),1) % 1000)
  }

export default LocData;

LocData.defaultProps = {
    sessionStore: defaultSessionStore,
};
