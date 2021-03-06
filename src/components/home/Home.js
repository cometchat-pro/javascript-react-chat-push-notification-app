import React, { Component } from 'react';
import { connect } from 'react-redux';
import './Home.css';

import * as actions from '../../store/action';
import { Redirect } from 'react-router-dom';
import { CometChat } from '@cometchat-pro/chat';
import { messaging } from '../../firebase';

class Home extends Component {
  constructor(props) {
    super(props);
    this.receiverIdRef = React.createRef();
    this.textMessageRef = React.createRef();
  }
  state = {
    receiverId: '',
    receiverType: 'user',
    textMessage: '',
    errorMessage: '',
    placeholder: 'Enter UID here',
  }

  async componentDidMount() {
    // The user has successfully logged in and is on the Home page.

    // 3. Register the FCM Token.
    // This step is comprised of multiple smaller steps before you can
    // actually register the FCM_TOKEN with CometChat's Push Notifications extension.
    let FCM_TOKEN = window.localStorage.getItem("FCM_TOKEN");
    if (!FCM_TOKEN) {
      // 3.1. Get the settings for the app.
      // This is required to get the list of extensions that are enabled.
      // From the list of extensions, check if the push-notification extension is enabled.
      // We only proceed when the Push Notifications extension is enabled.
      const settings = await CometChat.getAppSettings();
      const extension = settings.extensions.filter(ext => ext.id === 'push-notification');

      if (extension.length > 0) {
        try {
          // 3.2. Request User's permission to receive Push Notifications.
          // If the permission is granted, use getToken() method on the messaging object.
          // Store the obtained token in LocalStorage of your browser.
          FCM_TOKEN = await messaging.getToken();
          console.log("FCM_TOKEN", FCM_TOKEN);
          if (FCM_TOKEN) {
            window.localStorage.setItem("FCM_TOKEN", FCM_TOKEN);
            
            // 3.3. Register the FCM Token with CometChat's Push Notifications extension.
            // This is important since the Push Notification will be sent directly using 
            // FCM_TOKEN obtained above.
            // 
            // Next, you can check the logout() method below to delete the FCM Token.
            const response = await CometChat.registerTokenForPushNotification(FCM_TOKEN);
            console.log('Registered FCM Token:', response);
          }
        } catch (error) {
          // Elegantly fail if the Permission is not granted.
          console.log(error);
        }  
      } else {
        // Do not use request or register a token as the extensions is not enabled.
        console.log('Push Notifications extension is not enabled');
      }
    }
  }

  logout = async () => {
    // 4. Delete the FCM_TOKEN on logout.
    // Delete the FCM_TOKEN using the deleteToken() call on the messaging object.
    // Delete the FCM_TOKEN from localStorage to enable creation of new on relogin.
    await messaging.deleteToken();
    window.localStorage.removeItem('FCM_TOKEN');
    this.props.onLogout();
  }

  onReceiverIdChanged = (e) => {
    this.setState({
      ...this.state,
      receiverId: e.target.value,
    });
  }

  onReceiverTypeChanged = (e) => {
    this.setState({
      ...this.state,
      receiverType: e.target.value,
      placeholder: e.target.value == 'user' ? 'Enter UID here' : 'Enter GUID here',
    });
  }

  onTextMessageChanged = (e) => {
    this.setState({
      ...this.state,
      textMessage: e.target.value,
    });
  }

  showSnackbar = () => {
    var snackbar = document.getElementById("snackbar");
    snackbar.className = "show";
    setTimeout(() => { 
      snackbar.className = snackbar.className.replace("show", "");
      this.setState({
        ...this.state,
        errorMessage: '',
      });
    }, 3000);
  }

  sendMessage = () => {
    if (this.state.receiverId) {
      if (this.state.textMessage && this.state.textMessage.trim()) {
        console.log(this.state);
        const cometChatTextMessage = new CometChat.TextMessage(this.state.receiverId, this.state.textMessage, this.state.receiverType);
        CometChat.sendMessage(cometChatTextMessage).then(
          _ => {
            this.setState({
              ...this.state,
              receiverId: '',
              receiverType: 'user',
              textMessage: '',
            });
            this.receiverIdRef.current.focus();
          }, error => {
            this.setState({
              ...this.state,
              receiverId: '',
              receiverType: 'user',
              textMessage: '',
              errorMessage: error.message,
            });
            this.showSnackbar();
            this.receiverIdRef.current.focus();
            console.log('Error while sending message', error);
          }
        )
      } else {
        this.textMessageRef.current.focus();
      }
    } else {
      this.receiverIdRef.current.focus();
    }
  }

  render() {
    let authRedirect = null;

    if (!this.props.isLoggedIn) {
      authRedirect = <Redirect to='/login'/>
    }
    return (
      <div>
        { authRedirect }
        <div style = {{textAlign: 'center', paddingTop: '25px', paddingBottom: '10px', color: '#3b96ff', fontSize: 'x-large'}}>Logged in as: {this.props.user.name}</div>
        <div className="homeWrapper">
          <div className="formElement">
            <input autoFocus ref={this.receiverIdRef} id="receiverId" type="text" placeholder={this.state.placeholder} value={this.state.receiverId} onChange={this.onReceiverIdChanged}></input>
          </div>
          <div className="formElement">
            <div className="radioContainer">
              <input type="radio" onChange={this.onReceiverTypeChanged} checked={this.state.receiverType === 'user'} value="user" name="receiverType" id="receiverTypeUser"/><label htmlFor="receiverTypeUser">User</label>
              <input type="radio" onChange={this.onReceiverTypeChanged} checked={this.state.receiverType === 'group'} value="group" name="receiverType" id="receiverTypeGroup"/><label htmlFor="receiverTypeGroup">Group</label>
            </div>
          </div>
          <div className="formElement">
            <input ref={this.textMessageRef} type="text" placeholder="Message" value={this.state.textMessage} onChange={this.onTextMessageChanged}></input>
          </div>
          <div className="formElement">
            <button className="pointer" onClick={this.sendMessage} style={{ background: '#3b96ff', color: 'white' }}>Send</button>
          </div>
          <br />
          <div className="formElement">
            <button className="pointer" onClick={this.logout}>Logout</button>
          </div>
        </div>
        <div id="snackbar">{this.state.errorMessage}</div>
      </div>
    );
  }
}

const mapStateToProps = state => {
  return {
    loading: state.loading,
    error: state.error,
    isLoggedIn: state.isLoggedIn,
    user: state.user,
  };
};

const mapDispatchToProps = dispatch => {
  return {
    onLogout: () => dispatch(actions.logout())
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(Home);
