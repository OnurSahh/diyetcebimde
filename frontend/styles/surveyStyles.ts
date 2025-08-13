import { StyleSheet } from "react-native";
import { Dimensions } from "react-native";
const { height: screenHeight, width: screenWidth } = Dimensions.get('window');


const surveyStyles = StyleSheet.create({
container: {
    flex: 1,
    padding: 20,
    width: '100%',
    position: 'relative',
    backgroundColor: '#f0f0f0',
  },
  Scrollcontainer: {
    flex: 1,
    padding: 20,
  },  

  scrollViewContent: {
    padding: 20,
    paddingBottom: 80, // Buton için alan bırak
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: screenHeight * 0.05,
    width: screenWidth * 0.9,
  },
  backButton: {
    width: '10%',
    aspectRatio: 1,

  },
  backButtonText: {
    fontSize: 50,
    fontWeight: 'bold',
    lineHeight: 50,
  },
  progressContainer: {
    height: 8, // Progress bar yüksekliği
    backgroundColor: '#D3D3D3', // Arka plan rengi
    borderRadius: 4, // Yuvarlatma
    overflow: 'hidden', // Kenar taşmalarını gizlemek için
    width: '90%', // Tüm genişlik boyunca uzanacak
    justifyContent: 'center', // İçeriği yatayda ortala
    lineHeight: 8,
  },

  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50', // Dolum rengi
  },
  
  progressBox: {
    width: '5%',
    height: 10,
    marginHorizontal: 2,
    borderRadius: 4,
  },
  filledBox: {
    backgroundColor: '#d8d8d8',
  },
  emptyBox: {
    backgroundColor: '#323232',
  },
  sectionTitle: {
    fontSize: 45,
    fontStyle: 'italic',
    margin: 5,
    textAlign: 'center',
    alignSelf: 'center',
    color: '#898989',
  },
  mainTitle: {
    fontSize: 40,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 15,
  },
  questionText: {
    fontSize: 24,
    color: 'black',
    marginBottom: 10,
    fontWeight: 'bold',
  },
  body: {

    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignSelf: 'center',

  },

  optionsContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  optionButton: {
    width: screenWidth * 0.4,
    height: 60,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginVertical: 10,
    borderWidth: 1,
    borderRadius: 8,
    borderColor: 'gray',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedOption: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  optionText: {
    fontSize: 16,
    color: 'gray',
  },
  selectedOptionText: {
    color: 'white',
  },

  footerContainer: {
    height: 80,
    width: '50%',
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 20,
    alignSelf: 'center',
    justifyContent: 'center',

  },

  infoTitle: {
    fontSize: 20,
    fontStyle: 'italic',
    margin: 5,
    textAlign: 'justify',
    alignSelf: 'center',
    color: '#898989',
  },
  infoText: {
    fontSize: 16,
    fontStyle: 'italic',
    margin: 5,
    textAlign: 'justify',
    alignSelf: 'center',
    marginBottom: 20,
    color: '#999999',
  },
  inputContainer: {
    borderStyle: 'solid',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'red',
},
textInput:{
    width: screenWidth * 0.9,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 20,
    fontSize: 16,
    borderStyle: 'solid',
    borderWidth: 1,
},
nextButton: {
  backgroundColor: '#4CAF50',
  padding: 10,
  borderRadius: 5,
  alignItems: 'center',
},
  disabledNextButton: {
    backgroundColor: '#b3b3b3',
  },
  nextButtonText: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
  },
  timePickerButton: {
    width: screenWidth * 0.4,
    height: 60,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginVertical: 10,
    borderWidth: 1,
    borderRadius: 8,
    borderColor: 'gray',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timePickerText:{


  },
//BodyMeasures Page

estimateButton: {
  backgroundColor: '#4CAF50',
  padding: 10,
  borderRadius: 5,
  alignItems: 'center',
  marginVertical: 10,
},
estimateButtonText: {
  color: '#fff',
  fontSize: 16,
},


//sleepHabit Page
  // Diğer stilleriniz...
  confirmButton: {
      backgroundColor: '#4CAF50', // Buton rengi
      padding: 10,
      alignItems: 'center',
      borderRadius: 8,
      marginTop: 20,
  },
  confirmButtonText: {
      color: '#FFFFFF', // Yazı rengi
      fontSize: 16,
      fontWeight: 'bold',
  },
  // Diğer stilleriniz...

});

export default surveyStyles;